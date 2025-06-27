import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { fetchCourses, addCourse, updateCourse, deleteCourse } from '../services/courseService';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [formData, setFormData] = useState({
    Programme: '',
    Duration: '',
    Status: '',
  });
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const courseResponse = await fetchCourses();
        setCourses(courseResponse);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch courses: ' + err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateRow = (row) => {
    const errors = [];
    if (!row.Programme) errors.push('Missing Programme');
    if (!row.Duration || isNaN(parseInt(row.Duration))) errors.push('Invalid Duration (must be a number)');
    if (!['Active', 'Inactive'].includes(row.Status)) errors.push('Invalid Status (must be Active or Inactive)');

    // Check if course already exists based on Programme and Duration only
    const isDuplicate = courses.some(
      (course) =>
        course.Programme.toLowerCase() === row.Programme.toLowerCase() &&
        parseInt(course.Duration) === parseInt(row.Duration)
    );
    if (isDuplicate) errors.push('Course Already Added');

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
            Duration: parseInt(row.Duration) || row.Duration,
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
        toast.error('No valid courses to import.', {
          style: {
            border: '1px solid #4f46e5',
            padding: '16px',
            color: '#4f46e5',
            background: '#f0f7ff',
          },
          iconTheme: {
            primary: '#4f46e5',
            secondary: '#ffffff',
          },
        });
        return;
      }
      for (const row of validData) {
        const newCourse = await addCourse({
          Programme: row.Programme,
          Duration: row.Duration,
          Status: row.Status,
        });
        setCourses((prev) => [...prev, newCourse]);
      }
      toast.success(`Successfully imported ${validData.length} course${validData.length > 1 ? 's' : ''}.`, {
        style: {
          border: '1px solid #4f46e5',
          padding: '16px',
          color: '#4f46e5',
          background: '#f0f7ff',
        },
        iconTheme: {
          primary: '#4f46e5',
          secondary: '#ffffff',
        },
      });
      setShowImportModal(false);
      setImportData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Failed to import courses: ' + err.message);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    // Check for duplicates based on Programme and Duration
    const isDuplicate = courses.some(
      (course) =>
        course.Programme.toLowerCase() === formData.Programme.toLowerCase() &&
        parseInt(course.Duration) === parseInt(formData.Duration)
    );
    if (isDuplicate) {
      toast.error('Course with this Programme and Duration already exists.', {
        style: {
          border: '1px solid #4f46e5',
          padding: '16px',
          color: '#4f46e5',
          background: '#f0f7ff',
        },
        iconTheme: {
          primary: '#4f46e5',
          secondary: '#ffffff',
        },
      });
      return;
    }
    try {
      const newCourse = await addCourse({
        ...formData,
        Duration: parseInt(formData.Duration),
      });
      setCourses([...courses, newCourse]);
      setShowAddForm(false);
      setFormData({
        Programme: '',
        Duration: '',
        Status: '',
      });
      toast.success('Course added successfully.', {
        style: {
          border: '1px solid #4f46e5',
          padding: '16px',
          color: '#4f46e5',
          background: '#f0f7ff',
        },
        iconTheme: {
          primary: '#4f46e5',
          secondary: '#ffffff',
        },
      });
    } catch (err) {
      setError('Failed to add course: ' + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedCourse = await updateCourse(currentCourse.$id, {
        ...formData,
        Duration: parseInt(formData.Duration),
      });
      setCourses(
        courses.map((course) =>
          course.$id === currentCourse.$id ? updatedCourse : course
        )
      );
      setShowEditForm(false);
      setCurrentCourse(null);
      setFormData({
        Programme: '',
        Duration: '',
        Status: '',
      });
      toast.success('Course updated successfully.', {
        style: {
          border: '1px solid #4f46e5',
          padding: '16px',
          color: '#4f46e5',
          background: '#f0f7ff',
        },
        iconTheme: {
          primary: '#4f46e5',
          secondary: '#ffffff',
        },
      });
    } catch (err) {
      setError('Failed to update course: ' + err.message);
    }
  };

  const handleEdit = (course) => {
    setCurrentCourse(course);
    setFormData({
      Programme: course.Programme,
      Duration: course.Duration.toString(),
      Status: course.Status,
    });
    setShowEditForm(true);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(courseId);
        setCourses(courses.filter((course) => course.$id !== courseId));
        toast.success('Course deleted successfully.', {
          style: {
            border: '1px solid #4f46e5',
            padding: '16px',
            color: '#4f46e5',
            background: '#f0f7ff',
          },
          iconTheme: {
            primary: '#4f46e5',
            secondary: '#ffffff',
          },
        });
      } catch (err) {
        setError('Failed to delete course: ' + err.message);
      }
    }
  };

  const handleExportToExcel = () => {
    const exportData = courses.map((course) => ({
      Programme: course.Programme,
      Duration: `${course.Duration} Months`,
      Status: course.Status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');
    worksheet['!cols'] = [
      { wch: 30 }, // Programme
      { wch: 15 }, // Duration
      { wch: 15 }, // Status
    ];
    XLSX.writeFile(workbook, 'Courses.xlsx');
  };

  const closeModal = useCallback(() => {
    setShowAddForm(false);
    setShowEditForm(false);
    setShowImportModal(false);
    setCurrentCourse(null);
    setImportData([]);
    setFormData({
      Programme: '',
      Duration: '',
      Status: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    },
    [closeModal]
  );

  useEffect(() => {
    if (showAddForm || showEditForm || showImportModal) {
      document.addEventListener('keydown', handleKeyDown);
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAddForm, showEditForm, showImportModal, handleKeyDown]);

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
    }),
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-t-indigo-600 border-gray-200 rounded-full"
        ></motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 max-w-7xl mx-auto"
      >
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md">
          {error}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 sm:p-8">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-gray-50 to-gray-100 pt-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <h2 className="text-3xl font-bold text-gray-800 text-center bg-gradient-to-r from-indigo-600 to-indigo-400 text-transparent bg-clip-text">
              Courses Management
            </h2>
            <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
              <motion.label
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Import from Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
              </motion.label>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleExportToExcel}
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Export to Excel
              </motion.button>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Add New Course
              </motion.button>
            </div>
          </motion.div>

          {/* Sticky Table Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-t-xl shadow-lg"
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-2/5">Programme</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-1/5">Duration</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-1/5">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-1/5">Actions</th>
                </tr>
              </thead>
            </table>
          </motion.div>
        </div>

        {/* Scrollable Table Body */}
        <div className="bg-white rounded-b-xl shadow-lg overflow-x-auto">
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="divide-y divide-gray-200">
                <AnimatePresence>
                  {courses.map((course, index) => (
                    <motion.tr
                      key={course.$id}
                      custom={index}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="hover:bg-indigo-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-indigo-600 hover:text-indigo-800 w-2/5">
                        {course.Programme}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 w-1/5">{course.Duration} Months</td>
                      <td className="px-6 py-4 text-sm text-gray-600 w-1/5">{course.Status}</td>
                      <td className="px-6 py-4 text-sm font-medium w-1/5">
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => handleEdit(course)}
                          className="text-indigo-600 hover:text-indigo-800 mr-4 transition-colors"
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => handleDelete(course.$id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          Delete
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        <AnimatePresence>
          {(showAddForm || showEditForm) && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <div
                ref={modalRef}
                tabIndex={-1}
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              >
                <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                  {showEditForm ? 'Edit Course' : 'Add Course'}
                </h3>
                <form onSubmit={showEditForm ? handleEditSubmit : handleAddSubmit}>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
                      <input
                        type="text"
                        name="Programme"
                        value={formData.Programme}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                      <input
                        type="number"
                        name="Duration"
                        value={formData.Duration}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        name="Status"
                        value={formData.Status}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                        required
                      >
                        <option value="">Select Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-4">
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      type="button"
                      onClick={closeModal}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      type="submit"
                      className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                      {showEditForm ? 'Update Course' : 'Add Course'}
                    </motion.button>
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
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <div
                ref={modalRef}
                tabIndex={-1}
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <h3 className="text-2xl font-semibold text-gray-800 mb-6">Preview Courses to Import</h3>
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Review the data below. Rows with issues are highlighted in red and list specific errors. Correct the Excel file and re-upload, or proceed to import only valid rows.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Programme</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Duration</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <AnimatePresence>
                          {importData.map((row, index) => (
                            <motion.tr
                              key={row.rowIndex}
                              custom={index}
                              variants={rowVariants}
                              initial="hidden"
                              animate="visible"
                              exit="hidden"
                              className={row.isValid ? 'bg-white' : 'bg-red-50'}
                            >
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Programme || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Duration || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Status || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
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
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleImportConfirm}
                    disabled={importData.every((row) => !row.isValid)}
                    className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Confirm Import
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Courses;