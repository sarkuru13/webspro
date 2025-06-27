import React, { useState, useEffect, useRef } from 'react';
import { getAttendance, createAttendance, updateAttendance, deleteAttendance } from '../services/attendanceService';
import { getStudents } from '../services/studentService';
import { fetchCourses } from '../services/courseService';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

function AttendanceList() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [formData, setFormData] = useState({
    Student_Id: '',
    Status: '',
    Course_Id: '',
    Marked_By: '',
    Marked_at: '',
    Latitude: '',
    Longitude: ''
  });
  const [filters, setFilters] = useState({
    Status: '',
    Course_Id: '',
    Marked_By: ''
  });
  const modalRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [attendanceResponse, studentsResponse, coursesResponse] = await Promise.all([
          getAttendance(),
          getStudents(),
          fetchCourses()
        ]);
        console.log('Attendance Records:', attendanceResponse); // Debug
        console.log('Students:', studentsResponse.documents); // Debug
        console.log('Courses:', coursesResponse); // Debug
        setAttendanceRecords(attendanceResponse);
        setFilteredRecords(attendanceResponse);
        setStudents(studentsResponse.documents);
        setCourses(coursesResponse);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        setLoading(false);
        toast.error('Failed to fetch data: ' + err.message);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = attendanceRecords.filter((record) => {
      const matchesStatus = filters.Status ? record.Status === filters.Status : true;
      const matchesCourse = filters.Course_Id ? record.Course_Id === filters.Course_Id : true;
      const matchesMarkedBy = filters.Marked_By ? record.Marked_By.toLowerCase().includes(filters.Marked_By.toLowerCase()) : true;
      return matchesStatus && matchesCourse && matchesMarkedBy;
    });
    setFilteredRecords(filtered);
  }, [filters, attendanceRecords]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            Latitude: position.coords.latitude.toString(),
            Longitude: position.coords.longitude.toString()
          }));
          toast.success('Location captured successfully.');
        },
        (error) => {
          setError('Failed to get location: ' + error.message);
          toast.error('Failed to get location: ' + error.message);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  const validateStudentId = (studentId) => {
    return students.some((student) => student.$id === studentId);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Student_Id || !formData.Status || !formData.Course_Id || !formData.Marked_By || !formData.Marked_at) {
      toast.error('All required fields must be filled.');
      return;
    }
    if (isNaN(parseFloat(formData.Latitude)) || isNaN(parseFloat(formData.Longitude))) {
      toast.error('Valid Latitude and Longitude are required.');
      return;
    }
    if (!validateStudentId(formData.Student_Id)) {
      toast.error('Selected Student ID is invalid or does not exist.');
      return;
    }
    try {
      const newAttendance = await createAttendance({
        Student_Id: formData.Student_Id,
        Status: formData.Status,
        Course_Id: formData.Course_Id,
        Marked_By: formData.Marked_By,
        Marked_at: new Date(formData.Marked_at).toISOString(),
        Latitude: parseFloat(formData.Latitude),
        Longitude: parseFloat(formData.Longitude)
      });
      setAttendanceRecords([...attendanceRecords, newAttendance]);
      setShowAddForm(false);
      setFormData({
        Student_Id: '',
        Status: '',
        Course_Id: '',
        Marked_By: '',
        Marked_at: '',
        Latitude: '',
        Longitude: ''
      });
      toast.success('Attendance added successfully.');
    } catch (err) {
      setError('Failed to add attendance: ' + err.message);
      toast.error('Failed to add attendance: ' + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Student_Id || !formData.Status || !formData.Course_Id || !formData.Marked_By || !formData.Marked_at) {
      toast.error('All required fields must be filled.');
      return;
    }
    if (isNaN(parseFloat(formData.Latitude)) || isNaN(parseFloat(formData.Longitude))) {
      toast.error('Valid Latitude and Longitude are required.');
      return;
    }
    if (!validateStudentId(formData.Student_Id)) {
      toast.error('Selected Student ID is invalid or does not exist.');
      return;
    }
    try {
      const updatedAttendance = await updateAttendance(currentAttendance.$id, {
        Student_Id: formData.Student_Id,
        Status: formData.Status,
        Course_Id: formData.Course_Id,
        Marked_By: formData.Marked_By,
        Marked_at: new Date(formData.Marked_at).toISOString(),
        Latitude: parseFloat(formData.Latitude),
        Longitude: parseFloat(formData.Longitude)
      });
      setAttendanceRecords(
        attendanceRecords.map((record) =>
          record.$id === currentAttendance.$id ? updatedAttendance : record
        )
      );
      setShowEditForm(false);
      setCurrentAttendance(null);
      setFormData({
        Student_Id: '',
        Status: '',
        Course_Id: '',
        Marked_By: '',
        Marked_at: '',
        Latitude: '',
        Longitude: ''
      });
      toast.success('Attendance updated successfully.');
    } catch (err) {
      setError('Failed to update attendance: ' + err.message);
      toast.error('Failed to update attendance: ' + err.message);
    }
  };

  const getStudentId = (studentId) => {
    return typeof studentId === 'object' && studentId?.$id ? studentId.$id : String(studentId || '');
  };

  const handleEdit = (record) => {
    const studentId = getStudentId(record.Student_Id);
    console.log('Editing Record:', record); // Debug
    console.log('Setting Student_Id:', studentId); // Debug
    setCurrentAttendance(record);
    setFormData({
      Student_Id: studentId,
      Status: record.Status || '',
      Course_Id: record.Course_Id || '',
      Marked_By: record.Marked_By || '',
      Marked_at: record.Marked_at ? new Date(record.Marked_at).toISOString().slice(0, 16) : '',
      Latitude: record.Latitude ? record.Latitude.toString() : '',
      Longitude: record.Longitude ? record.Longitude.toString() : ''
    });
    setShowEditForm(true);
  };

  const handleDelete = async (attendanceId) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        await deleteAttendance(attendanceId);
        setAttendanceRecords(attendanceRecords.filter((record) => record.$id !== attendanceId));
        toast.success('Attendance deleted successfully.');
      } catch (err) {
        setError('Failed to delete attendance: ' + err.message);
        toast.error('Failed to delete attendance: ' + err.message);
      }
    }
  };

  const closeModal = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setCurrentAttendance(null);
    setFormData({
      Student_Id: '',
      Status: '',
      Course_Id: '',
      Marked_By: '',
      Marked_at: '',
      Latitude: '',
      Longitude: ''
    });
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
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-700">
        {error}
        <button
          onClick={() => window.location.reload()}
          className="ml-4 bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Attendance List</h2>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded"
          >
            Add Attendance
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Filter by Status</label>
            <select
              name="Status"
              value={filters.Status}
              onChange={handleFilterChange}
              className="w-full border rounded p-2"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Filter by Course</label>
            <select
              name="Course_Id"
              value={filters.Course_Id}
              onChange={handleFilterChange}
              className="w-full border rounded p-2"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.$id} value={course.$id}>
                  {course.Programme}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Filter by Marked By</label>
            <input
              type="text"
              name="Marked_By"
              value={filters.Marked_By}
              onChange={handleFilterChange}
              className="w-full border rounded p-2"
              placeholder="Enter Marked By"
            />
          </div>
        </div>

        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="px-4 py-2 border">Student Name</th>
              <th className="px-4 py-2 border">Marked At</th>
              <th className="px-4 py-2 border">Status</th>
              <th className="px-4 py-2 border">Course Name</th>
              <th className="px-4 py-2 border">Marked By</th>
              <th className="px-4 py-2 border">Location</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredRecords.map((record, index) => {
                const studentId = getStudentId(record.Student_Id);
                const student = students.find((s) => s.$id === studentId);
                console.log('Record Student_Id:', record.Student_Id, 'Found Student:', student); // Debug
                return (
                  <motion.tr
                    key={record.$id}
                    custom={index}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <td className="px-4 py-2 border">
                      {student ? student.Name : `Unknown Student (ID: ${studentId})`}
                    </td>
                    <td className="px-4 py-2 border">
                      {new Date(record.Marked_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border">{record.Status}</td>
                    <td className="px-4 py-2 border">
                      {courses.find((c) => c.$id === record.Course_Id)?.Programme || 'Unknown Course'}
                    </td>
                    <td className="px-4 py-2 border">{record.Marked_By}</td>
                    <td className="px-4 py-2 border">{`${record.Latitude}, ${record.Longitude}`}</td>
                    <td className="px-4 py-2 border">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-indigo-600 hover:text-indigo-800 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record.$id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
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
              <div
                ref={modalRef}
                className="bg-white p-6 rounded max-w-md w-full"
                tabIndex={-1}
              >
                <h3 className="text-xl font-semibold mb-4">
                  {showEditForm ? 'Edit Attendance' : 'Add Attendance'}
                </h3>
                <form onSubmit={showEditForm ? handleEditSubmit : handleAddSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Student</label>
                    <select
                      name="Student_Id"
                      value={formData.Student_Id}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      <option value="">Select Student</option>
                      {students.map((student) => (
                        <option key={student.$id} value={student.$id}>
                          {student.Name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      name="Status"
                      value={formData.Status}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      <option value="">Select Status</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Late">Late</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Course</label>
                    <select
                      name="Course_Id"
                      value={formData.Course_Id}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      <option value="">Select Course</option>
                      {courses.map((course) => (
                        <option key={course.$id} value={course.$id}>
                          {course.Programme}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Marked By</label>
                    <input
                      type="text"
                      name="Marked_By"
                      value={formData.Marked_By}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Marked At</label>
                    <input
                      type="datetime-local"
                      name="Marked_at"
                      value={formData.Marked_at}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      name="Latitude"
                      value={formData.Latitude}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      name="Longitude"
                      value={formData.Longitude}
                      onChange={handleInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
                    >
                      Get Current Location
                    </button>
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
                      {showEditForm ? 'Update Attendance' : 'Add Attendance'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AttendanceList;