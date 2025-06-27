import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../services/studentService';
import { fetchCourses } from '../services/courseService';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

function Students() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  const [importData, setImportData] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [courseFilter, setCourseFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    Name: '',
    Gender: '',
    ABC_ID: '',
    Status: '',
    Course: '',
    Semester: '',
    Batch: '',
    Year: '',
    Address: ''
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [studentResponse, courseResponse] = await Promise.all([
          getStudents(),
          fetchCourses(),
        ]);
        setStudents(studentResponse.documents);
        setFilteredStudents(studentResponse.documents);
        setCourses(courseResponse);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    let updatedStudents = [...students];
    if (courseFilter) {
      updatedStudents = updatedStudents.filter(
        student => student.Course?.$id === courseFilter
      );
    }
    updatedStudents.sort((a, b) => {
      const courseA = a.Course?.Programme || '';
      const courseB = b.Course?.Programme || '';
      return sortOrder === 'asc'
        ? courseA.localeCompare(courseB)
        : courseB.localeCompare(courseB);
    });
    setFilteredStudents(updatedStudents);
  }, [students, courseFilter, sortOrder]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCourseFilterChange = (e) => {
    setCourseFilter(e.target.value);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const exportToExcel = () => {
    const exportData = filteredStudents.map(student => ({
      Name: student.Name || 'N/A',
      'ABC ID': student.ABC_ID || 'N/A',
      Course: student.Course?.Programme || 'N/A',
      Batch: student.Batch || 'N/A',
      Semester: student.Semester || 'N/A',
      Year: student.Year || 'N/A',
      Status: student.Status || 'N/A',
      Gender: student.Gender || 'N/A',
      Address: student.Address || 'N/A'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 30 }
    ];
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'Students_Data.xlsx');
  };

  const validateRow = (row) => {
    const errors = [];
    if (!row.Name) errors.push('Missing Name');
    if (!row['ABC ID'] || isNaN(parseInt(row['ABC ID']))) errors.push('Invalid ABC ID (must be a number)');
    if (!['Male', 'Female', 'Others'].includes(row.Gender)) errors.push('Invalid Gender (must be Male, Female, or Others)');
    if (!['Active', 'Inactive'].includes(row.Status)) errors.push('Invalid Status (must be Active or Inactive)');
    if (row.Course && !courses.some(c => c.Programme === row.Course)) errors.push('Invalid Course (not found)');
    if (row.Semester && isNaN(parseInt(row.Semester))) errors.push('Invalid Semester (must be a number)');
    if (row.Batch && isNaN(parseInt(row.Batch))) errors.push('Invalid Batch (must be a number)');
    if (row.Year && !['First', 'Second', 'Third', 'Fourth', 'Fifth'].includes(row.Year)) {
      errors.push('Invalid Year (must be First, Second, Third, Fourth, or Fifth)');
    }
    // Check for duplicate ABC ID
    const isDuplicate = students.some(
      student => parseInt(student.ABC_ID) === parseInt(row['ABC ID'])
    );
    if (isDuplicate) errors.push('Duplicate ABC ID');
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
          const course = courses.find(c => c.Programme === row.Course);
          return {
            ...row,
            Course: course ? course.$id : row.Course,
            ABC_ID: parseInt(row['ABC ID']) || row['ABC ID'],
            Semester: parseInt(row.Semester) || row.Semester,
            Batch: parseInt(row.Batch) || row.Batch,
            isValid,
            errors,
            rowIndex: index
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
      const validData = importData.filter(row => row.isValid);
      if (validData.length === 0) {
        toast.error('No valid students to import.');
        return;
      }
      for (const row of validData) {
        const newStudent = await createStudent({
          Name: row.Name,
          Gender: row.Gender,
          ABC_ID: row.ABC_ID,
          Status: row.Status,
          Course: row.Course || null,
          Semester: row.Semester || null,
          Batch: row.Batch || null,
          Year: row.Year || null,
          Address: row.Address || null
        });
        setStudents(prev => [...prev, newStudent]);
      }
      toast.success(`Successfully imported ${validData.length} student${validData.length > 1 ? 's' : ''}.`, {
        style: {
          border: '1px solid #4f46e5',
          padding: '16px',
          color: '#4f46e5',
          background: '#f0f7ff'
        },
        iconTheme: {
          primary: '#4f46e5',
          secondary: '#ffffff'
        }
      });
      setShowImportModal(false);
      setImportData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Failed to import students: ' + err.message);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const newStudent = await createStudent({
        ...formData,
        ABC_ID: parseInt(formData.ABC_ID),
        Semester: parseInt(formData.Semester) || null,
        Batch: parseInt(formData.Batch) || null,
        Course: formData.Course || null,
        Year: formData.Year || null,
        Address: formData.Address || null
      });
      setStudents([...students, newStudent]);
      setShowAddForm(false);
      setFormData({
        Name: '',
        Gender: '',
        ABC_ID: '',
        Status: '',
        Course: '',
        Semester: '',
        Batch: '',
        Year: '',
        Address: ''
      });
      toast.success('Student added successfully.', {
        style: {
          border: '1px solid #4f46e5',
          padding: '16px',
          color: '#4f46e5',
          background: '#f0f7ff'
        },
        iconTheme: {
          primary: '#4f46e5',
          secondary: '#ffffff'
        }
      });
    } catch (err) {
      if (err.message.includes('Student with this ABC ID already exists')) {
        setDuplicateError('Student with this ABC ID already exists.');
        setShowDuplicateModal(true);
      } else {
        setError('Failed to add student: ' + err.message);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedStudent = await updateStudent(currentStudent.$id, {
        ...formData,
        ABC_ID: parseInt(formData.ABC_ID),
        Semester: parseInt(formData.Semester) || null,
        Batch: parseInt(formData.Batch) || null,
        Course: formData.Course || null,
        Year: formData.Year || null,
        Address: formData.Address || null
      });
      setStudents(
        students.map((student) =>
          student.$id === currentStudent.$id ? updatedStudent : student
        )
      );
      setShowEditForm(false);
      setCurrentStudent(null);
      setFormData({
        Name: '',
        Gender: '',
        ABC_ID: '',
        Status: '',
        Course: '',
        Semester: '',
        Batch: '',
        Year: '',
        Address: ''
      });
      toast.success('Student updated successfully.', {
        style: {
          border: '1px solid #4f46e5',
          padding: '16px',
          color: '#4f46e5',
          background: '#f0f7ff'
        },
        iconTheme: {
          primary: '#4f46e5',
          secondary: '#ffffff'
        }
      });
    } catch (err) {
      if (err.message.includes('Another student with this ABC ID already exists')) {
        setDuplicateError('Another student with this ABC ID already exists.');
        setShowDuplicateModal(true);
      } else {
        setError('Failed to update student: ' + err.message);
      }
    }
  };

  const handleShowDetails = (student) => {
    setCurrentStudent(student);
    setShowDetailsModal(true);
  };

  const handleEdit = (student) => {
    setCurrentStudent(student);
    const newFormData = {
      Name: student.Name || '',
      Gender: student.Gender || '',
      ABC_ID: student.ABC_ID ? student.ABC_ID.toString() : '',
      Status: student.Status || '',
      Course: student.Course?.$id || '',
      Semester: student.Semester ? student.Semester.toString() : '',
      Batch: student.Batch ? student.Batch.toString() : '',
      Year: student.Year || '',
      Address: student.Address || ''
    };
    setFormData(newFormData);
    setShowEditForm(true);
  };

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudent(studentId);
        setStudents(students.filter((student) => student.$id !== studentId));
        toast.success('Student deleted successfully.', {
          style: {
            border: '1px solid #4f46e5',
            padding: '16px',
            color: '#4f46e5',
            background: '#f0f7ff'
          },
          iconTheme: {
            primary: '#4f46e5',
            secondary: '#ffffff'
          }
        });
      } catch (err) {
        setError('Failed to delete student: ' + err.message);
      }
    }
  };

  const closeModal = useCallback(() => {
    setShowAddForm(false);
    setShowEditForm(false);
    setShowDetailsModal(false);
    setShowImportModal(false);
    setShowDuplicateModal(false);
    setDuplicateError('');
    setCurrentStudent(null);
    setImportData([]);
    setFormData({
      Name: '',
      Gender: '',
      ABC_ID: '',
      Status: '',
      Course: '',
      Semester: '',
      Batch: '',
      Year: '',
      Address: ''
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
    if (showAddForm || showEditForm || showDetailsModal || showImportModal || showDuplicateModal) {
      document.addEventListener('keydown', handleKeyDown);
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAddForm, showEditForm, showDetailsModal, showImportModal, showDuplicateModal, handleKeyDown]);

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' }
    })
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 }
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
              Students Management
            </h2>
            <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="text-sm font-medium text-gray-700">Filter by Course:</label>
                <select
                  value={courseFilter}
                  onChange={handleCourseFilterChange}
                  className="rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-800 px-4 py-2 transition-all duration-300"
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.$id} value={course.$id}>
                      {course.Programme}
                    </option>
                  ))}
                </select>
              </motion.div>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={toggleSortOrder}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Sort by Course ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
              </motion.button>
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
                onClick={exportToExcel}
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
                Add New Student
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-1/4">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-1/6">ABC ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-1/6">Course</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-1/6">Batch</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-1/6">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-800 w-1/6">Actions</th>
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
                  {filteredStudents.map((student, index) => (
                    <motion.tr
                      key={student.$id}
                      custom={index}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="hover:bg-indigo-50 transition-colors"
                    >
                      <td
                        className="px-6 py-4 text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer w-1/4"
                        onClick={() => handleShowDetails(student)}
                      >
                        {student.Name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 w-1/6">{student.ABC_ID}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 w-1/6">{student.Course?.Programme || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 w-1/6">{student.Batch}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 w-1/6">{student.Status}</td>
                      <td className="px-6 py-4 text-sm font-medium w-1/6">
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(student);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 mr-4 transition-colors"
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(student.$id);
                          }}
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
                  {showEditForm ? 'Edit Student' : 'Add Student'}
                </h3>
                <form onSubmit={showEditForm ? handleEditSubmit : handleAddSubmit}>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        name="Name"
                        value={formData.Name}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        name="Gender"
                        value={formData.Gender}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ABC ID</label>
                      <input
                        type="number"
                        name="ABC_ID"
                        value={formData.ABC_ID}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                      <select
                        name="Course"
                        value={formData.Course}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                      >
                        <option value="">Select Course</option>
                        {courses.map((course) => (
                          <option key={course.$id} value={course.$id}>
                            {course.Programme}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                      <input
                        type="number"
                        name="Semester"
                        value={formData.Semester}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                        min="1"
                        max="8"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                      <input
                        type="number"
                        name="Batch"
                        value={formData.Batch}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <select
                        name="Year"
                        value={formData.Year}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                      >
                        <option value="">Select Year</option>
                        <option value="First">First</option>
                        <option value="Second">Second</option>
                        <option value="Third">Third</option>
                        <option value="Fourth">Fourth</option>
                        <option value="Fifth">Fifth</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        name="Address"
                        value={formData.Address}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                        rows="4"
                      />
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
                      {showEditForm ? 'Update Student' : 'Add Student'}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {showDetailsModal && currentStudent && (
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
                <h3 className="text-2xl font-semibold text-gray-800 mb-6">Student Details</h3>
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Education Information</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="text-gray-600">{currentStudent.Name}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-700">ABC ID:</span>
                      <span className="text-gray-600">{currentStudent.ABC_ID}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-700">Course:</span>
                      <span className="text-gray-600">{currentStudent.Course?.Programme || 'N/A'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-700">Semester:</span>
                      <span className="text-gray-600">{currentStudent.Semester || 'N/A'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-700">Batch:</span>
                      <span className="text-gray-600">{currentStudent.Batch || 'N/A'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-700">Year:</span>
                      <span className="text-gray-600">{currentStudent.Year || 'N/A'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className="text-gray-600">{currentStudent.Status}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-700">Gender:</span>
                      <span className="text-gray-600">{currentStudent.Gender}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Address Information</h4>
                  <p className="text-gray-600">
                    {currentStudent.Address ? currentStudent.Address : 'No address provided.'}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={closeModal}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Close
                  </motion.button>
                </div>
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
                <h3 className="text-2xl font-semibold text-gray-800 mb-6">Preview Students to Import</h3>
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Review the data below. Rows with issues are highlighted in red and list specific errors. Correct the Excel file and re-upload, or proceed to import only valid rows.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">ABC ID</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Course</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Batch</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Semester</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Year</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Gender</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">Address</th>
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
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Name || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.ABC_ID || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {courses.find(c => c.$id === row.Course)?.Programme || row.Course || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Batch || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Semester || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Year || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Status || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Gender || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.Address || 'N/A'}</td>
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
                    disabled={importData.every(row => !row.isValid)}
                    className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Confirm Import
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {showDuplicateModal && (
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
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-lg w-full"
              >
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Duplicate Student</h3>
                <p className="text-sm text-red-600 mb-6">{duplicateError}</p>
                <div className="flex justify-end">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={closeModal}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    OK
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

export default Students;