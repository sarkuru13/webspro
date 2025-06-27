import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { fetchHolidays, addHoliday, updateHoliday, deleteHoliday } from '../services/holidayService';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [currentHoliday, setCurrentHoliday] = useState(null);
  const [formData, setFormData] = useState({
    Title: '',
    Date_from: '',
    Date_to: '',
    Description: '',
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const holidayResponse = await fetchHolidays();
        setHolidays(holidayResponse);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch holidays: ' + err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateRow = (row) => {
    const errors = [];
    if (!row.Title) errors.push('Missing Title');
    if (!row.Date_from || isNaN(Date.parse(row.Date_from))) errors.push('Invalid Date From');
    if (!row.Date_to || isNaN(Date.parse(row.Date_to))) errors.push('Invalid Date To');
    if (row.Date_to && row.Date_from && new Date(row.Date_to) < new Date(row.Date_from)) {
      errors.push('Date To must be after Date From');
    }
    return { isValid: errors.length === 0, errors };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const validatedData = jsonData.map((row, index) => {
          const { isValid, errors } = validateRow(row);
          return {
            ...row,
            Date_from: row.Date_from ? new Date(row.Date_from).toISOString() : row.Date_from,
            Date_to: row.Date_to ? new Date(row.Date_to).toISOString() : row.Date_to,
            isValid,
            errors,
            rowIndex: index,
          };
        });
        setImportData(validatedData);
        setShowImportModal(true);
      } catch (err) {
        setError('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportConfirm = async () => {
    try {
      const validData = importData.filter((row) => row.isValid);
      if (validData.length === 0) {
        toast.error('No valid holidays to import.');
        return;
      }
      for (const row of validData) {
        const newHoliday = await addHoliday({
          Title: row.Title,
          Date_from: row.Date_from,
          Date_to: row.Date_to,
          Description: row.Description || '',
        });
        setHolidays((prev) => [...prev, newHoliday]);
      }
      toast.success(`Successfully imported ${validData.length} holiday${validData.length > 1 ? 's' : ''}.`);
      setShowImportModal(false);
      setImportData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError('Failed to import holidays: ' + err.message);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (new Date(formData.Date_to) < new Date(formData.Date_from)) {
      toast.error('Date To must be after Date From.');
      return;
    }
    try {
      const newHoliday = await addHoliday({
        Title: formData.Title,
        Date_from: new Date(formData.Date_from).toISOString(),
        Date_to: new Date(formData.Date_to).toISOString(),
        Description: formData.Description,
      });
      setHolidays([...holidays, newHoliday]);
      setShowAddForm(false);
      setFormData({
        Title: '',
        Date_from: '',
        Date_to: '',
        Description: '',
      });
      toast.success('Holiday added successfully.');
    } catch (err) {
      setError('Failed to add holiday: ' + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (new Date(formData.Date_to) < new Date(formData.Date_from)) {
      toast.error('Date To must be after Date From.');
      return;
    }
    try {
      const updatedHoliday = await updateHoliday(currentHoliday.$id, {
        Title: formData.Title,
        Date_from: new Date(formData.Date_from).toISOString(),
        Date_to: new Date(formData.Date_to).toISOString(),
        Description: formData.Description,
      });
      setHolidays(
        holidays.map((holiday) =>
          holiday.$id === currentHoliday.$id ? updatedHoliday : holiday
        )
      );
      setShowEditForm(false);
      setCurrentHoliday(null);
      setFormData({
        Title: '',
        Date_from: '',
        Date_to: '',
        Description: '',
      });
      toast.success('Holiday updated successfully.');
    } catch (err) {
      setError('Failed to update holiday: ' + err.message);
    }
  };

  const handleEdit = (holiday) => {
    setCurrentHoliday(holiday);
    setFormData({
      Title: holiday.Title,
      Date_from: new Date(holiday.Date_from).toISOString().slice(0, 16),
      Date_to: new Date(holiday.Date_to).toISOString().slice(0, 16),
      Description: holiday.Description || '',
    });
    setShowEditForm(true);
  };

  const handleDelete = async (holidayId) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await deleteHoliday(holidayId);
        setHolidays(holidays.filter((holiday) => holiday.$id !== holidayId));
        toast.success('Holiday deleted successfully.');
      } catch (err) {
        setError('Failed to delete holiday: ' + err.message);
      }
    }
  };

  const handleExportToExcel = () => {
    const exportData = holidays.map((holiday) => ({
      Title: holiday.Title,
      Date_from: new Date(holiday.Date_from).toLocaleDateString(),
      Date_to: new Date(holiday.Date_to).toLocaleDateString(),
      Description: holiday.Description || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Holidays');
    worksheet['!cols'] = [
      { wch: 30 }, // Title
      { wch: 15 }, // Date_from
      { wch: 15 }, // Date_to
      { wch: 40 }, // Description
    ];
    XLSX.writeFile(workbook, 'Holidays.xlsx');
  };

  const closeModal = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setShowImportModal(false);
    setCurrentHoliday(null);
    setImportData([]);
    setFormData({
      Title: '',
      Date_from: '',
      Date_to: '',
      Description: '',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-700">{error}</div>;
  }

  return (
    <div className="min-h-screen p-6">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Holidays Management</h2>
        <div className="flex gap-2 mb-4">
          <label className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded cursor-pointer">
            Import from Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportToExcel}
            className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
          >
            Export to Excel
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded"
          >
            Add New Holiday
          </button>
        </div>

        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="px-4 py-2 border">Title</th>
              <th className="px-4 py-2 border">Date From</th>
              <th className="px-4 py-2 border">Date To</th>
              <th className="px-4 py-2 border">Description</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {holidays.map((holiday, index) => (
                <motion.tr
                  key={holiday.$id}
                  custom={index}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <td className="px-4 py-2 border">{holiday.Title}</td>
                  <td className="px-4 py-2 border">
                    {new Date(holiday.Date_from).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 border">
                    {new Date(holiday.Date_to).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 border">{holiday.Description || 'N/A'}</td>
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => handleEdit(holiday)}
                      className="text-indigo-600 hover:text-indigo-800 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(holiday.$id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        <AnimatePresence>
          {(showAddForm || showEditForm) && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 bg-black/50 flex items-center justify-center"
            >
              <div className="bg-white p-6 rounded max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">
                  {showEditForm ? 'Edit Holiday' : 'Add Holiday'}
                </h3>
                <form onSubmit={showEditForm ? handleEditSubmit : handleAddSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      name="Title"
                      value={formData.Title}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Date From</label>
                    <input
                      type="datetime-local"
                      name="Date_from"
                      value={formData.Date_from}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Date To</label>
                    <input
                      type="datetime-local"
                      name="Date_to"
                      value={formData.Date_to}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      name="Description"
                      value={formData.Description}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      rows="4"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded"
                    >
                      {showEditForm ? 'Update Holiday' : 'Add Holiday'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
          {showImportModal && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 bg-black/50 flex items-center justify-center"
            >
              <div className="bg-white p-6 rounded max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                <h3 className="text-xl font-semibold mb-4">Preview Holidays to Import</h3>
                <p className="text-sm mb-4">
                  Review the data below. Rows with issues are highlighted in red. Correct the Excel file and re-upload, or import valid rows.
                </p>
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 border">Title</th>
                      <th className="px-4 py-2 border">Date From</th>
                      <th className="px-4 py-2 border">Date To</th>
                      <th className="px-4 py-2 border">Description</th>
                      <th className="px-4 py-2 border">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {importData.map((row, index) => (
                        <motion.tr
                          key={row.rowIndex}
                          custom={index}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          className={row.isValid ? '' : 'bg-red-50'}
                        >
                          <td className="px-4 py-2 border">{row.Title || 'N/A'}</td>
                          <td className="px-4 py-2 border">
                            {row.Date_from ? new Date(row.Date_from).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-2 border">
                            {row.Date_to ? new Date(row.Date_to).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-2 border">{row.Description || 'N/A'}</td>
                          <td className="px-4 py-2 border">
                            {row.isValid ? (
                              <span className="text-green-600">Valid</span>
                            ) : (
                              <div className="text-red-600">
                                {row.errors.map((err, i) => (
                                  <div key={i}>{err}</div>
                                ))}
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportConfirm}
                    disabled={importData.every((row) => !row.isValid)}
                    className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white py-2 px-4 rounded"
                  >
                    Confirm Import
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Holidays;