import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { fetchHolidays } from '../services/holidayService';
import { getAttendance, createAttendance, updateAttendance, deleteAttendance } from '../services/attendanceService';
import { getStudents } from '../services/studentService';
import { fetchCourses } from '../services/courseService';

function AttendanceList() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [holidays, setHolidays] = useState([]);
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
  const modalRef = useRef(null);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [holidayDocs, attendanceResponse, studentsResponse, coursesResponse] = await Promise.all([
          fetchHolidays(),
          getAttendance(),
          getStudents(),
          fetchCourses()
        ]);
        console.log('Fetched Data:', { holidayDocs, attendanceResponse, studentsResponse, coursesResponse });
        setHolidays(holidayDocs || []);
        setAttendanceRecords(attendanceResponse || []);
        setFilteredRecords(attendanceResponse || []);
        setStudents(studentsResponse?.documents || []);
        setCourses(coursesResponse || []);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to fetch data: ' + err.message);
        toast.error('Failed to fetch data: ' + err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter attendance records by selected date
  useEffect(() => {
    if (!selectedDate) {
      setFilteredRecords(attendanceRecords);
      return;
    }
    const filtered = attendanceRecords.filter((record) => {
      if (!record?.Marked_at) {
        console.warn('Missing Marked_at in record:', record);
        return false;
      }
      const recordDate = new Date(record.Marked_at);
      if (isNaN(recordDate.getTime())) {
        console.warn('Invalid date in record:', record);
        return false;
      }
      return recordDate.toDateString() === selectedDate.toDateString();
    });
    console.log('Filtered Records:', filtered);
    setFilteredRecords(filtered);
  }, [selectedDate, attendanceRecords]);

  // Group attendance records by course
  const groupedByCourse = filteredRecords.reduce((acc, record) => {
    const courseId = record?.Course_Id || 'unknown';
    if (!acc[courseId]) {
      acc[courseId] = [];
    }
    acc[courseId].push(record);
    return acc;
  }, {});

  // Get holiday dates
  const getHolidayDates = (dateFrom, dateTo) => {
    const dates = [];
    const start = new Date(dateFrom);
    const end = dateTo ? new Date(dateTo) : new Date(dateFrom);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn(`Invalid holiday date range: ${dateFrom} to ${dateTo}`);
      return dates;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    let current = start;
    while (current <= end) {
      dates.push(current.toDateString());
      current = new Date(current);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const holidayDates = holidays.reduce((acc, holiday) => {
    return [...acc, ...getHolidayDates(holiday?.Date_from, holiday?.Date_to)];
  }, []);

  // Calendar helper functions
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday (0) or Saturday (6)
  };

  const isHoliday = (date) => {
    return holidayDates.includes(date.toDateString());
  };

  const handleDateClick = (date) => {
    if (isHoliday(date)) {
      toast.error('Cannot select holidays.');
      return;
    }
    if (isWeekend(date)) {
      toast.error('Cannot select weekends.');
      return;
    }
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(localDate);
    setFormData((prev) => ({
      ...prev,
      Marked_at: localDate.toISOString().slice(0, 16)
    }));
    console.log('Selected Date:', localDate);
    toast.success(`Selected date: ${localDate.toLocaleDateString()}`);
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      if (isHoliday(date)) {
        return 'bg-blue-100 text-black';
      }
      if (isWeekend(date)) {
        return 'bg-gray-200 text-gray-600';
      }
      return 'hover:bg-indigo-100 cursor-pointer';
    }
    return '';
  };

  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      return isHoliday(date) || isWeekend(date);
    }
    return false;
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'Student_Id') {
      const selectedStudent = students.find((student) => student?.$id === value);
      const courseId = selectedStudent?.Course?.$id || '';
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        Course_Id: courseId
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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
    return students.some((student) => student?.$id === studentId);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Student_Id || !formData.Status || !formData.Course_Id || !formData.Marked_By) {
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
        Marked_at: selectedDate ? selectedDate.toISOString().slice(0, 16) : '',
        Latitude: '',
        Longitude: ''
      });
      toast.success('Attendance added successfully.');
    } catch (err) {
      console.error('Add attendance error:', err);
      setError('Failed to add attendance: ' + err.message);
      toast.error('Failed to add attendance: ' + err.message);
    }
  };

  const getStudentId = (studentId) => {
    return typeof studentId === 'object' && studentId?.$id ? studentId.$id : String(studentId || '');
  };

  const handleEdit = (record) => {
    const studentId = getStudentId(record?.Student_Id);
    const selectedStudent = students.find((student) => student?.$id === studentId);
    const courseId = selectedStudent?.Course?.$id || record?.Course_Id || '';
    setCurrentAttendance(record);
    setFormData({
      Student_Id: studentId,
      Status: record?.Status || '',
      Course_Id: courseId,
      Marked_By: record?.Marked_By || '',
      Marked_at: record?.Marked_at ? new Date(record.Marked_at).toISOString().slice(0, 16) : '',
      Latitude: record?.Latitude ? record.Latitude.toString() : '',
      Longitude: record?.Longitude ? record.Longitude.toString() : ''
    });
    setShowEditForm(true);
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
      const updatedAttendance = await updateAttendance(currentAttendance?.$id, {
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
          record?.$id === currentAttendance?.$id ? updatedAttendance : record
        )
      );
      setShowEditForm(false);
      setCurrentAttendance(null);
      setFormData({
        Student_Id: '',
        Status: '',
        Course_Id: '',
        Marked_By: '',
        Marked_at: selectedDate ? selectedDate.toISOString().slice(0, 16) : '',
        Latitude: '',
        Longitude: ''
      });
      toast.success('Attendance updated successfully.');
    } catch (err) {
      console.error('Update attendance error:', err);
      setError('Failed to update attendance: ' + err.message);
      toast.error('Failed to update attendance: ' + err.message);
    }
  };

  const handleDelete = async (attendanceId) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        await deleteAttendance(attendanceId);
        setAttendanceRecords(attendanceRecords.filter((record) => record?.$id !== attendanceId));
        toast.success('Attendance deleted successfully.');
      } catch (err) {
        console.error('Delete attendance error:', err);
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
      Marked_at: selectedDate ? selectedDate.toISOString().slice(0, 16) : '',
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
    <div className="min-h-screen p-6 bg-gray-100">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">Attendance Calendar</h2>
        <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
          <Calendar
            onClickDay={handleDateClick}
            tileClassName={tileClassName}
            tileDisabled={tileDisabled}
            value={selectedDate}
            className="border-none rounded-lg mx-auto"
          />
          <div className="mt-4 flex justify-center gap-4">
            <div className="flex items-center">
              <span className="w-4 h-4 bg-blue-100 inline-block mr-2"></span>
              <span>Holiday</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 bg-gray-200 inline-block mr-2"></span>
              <span>Weekend</span>
            </div>
          </div>
          {selectedDate && (
            <div className="text-center mt-4">
              <p className="text-lg">
                Selected: <span className="font-semibold">{selectedDate.toLocaleDateString()}</span>
              </p>
              <p className="text-sm text-gray-600">
                Showing attendance records for the selected date, grouped by course.
              </p>
            </div>
          )}
        </div>

        {selectedDate && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Attendance List for {selectedDate.toLocaleDateString()}</h2>
              <div>
                <button
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      Marked_at: selectedDate ? selectedDate.toISOString().slice(0, 16) : ''
                    }));
                    setShowAddForm(true);
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded mr-2"
                >
                  Add Attendance
                </button>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Clear Date
                </button>
              </div>
            </div>

            {Object.keys(groupedByCourse).length === 0 ? (
              <div className="text-center text-gray-600">No attendance records for this date.</div>
            ) : (
              Object.keys(groupedByCourse).map((courseId) => {
                const course = courses.find((c) => c?.$id === courseId);
                return (
                  <div key={courseId} className="mb-8">
                    <h3 className="text-xl font-semibold mb-2">
                      {course ? course.Programme : 'Unknown Course'}
                    </h3>
                    <table className="min-w-full border">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 border">Student Name</th>
                          <th className="px-4 py-2 border">Status</th>
                          <th className="px-4 py-2 border">Marked By</th>
                          <th className="px-4 py-2 border">Location</th>
                          <th className="px-4 py-2 border">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {groupedByCourse[courseId].map((record, index) => {
                            const studentId = getStudentId(record?.Student_Id);
                            const student = students.find((s) => s?.$id === studentId);
                            return (
                              <motion.tr
                                key={record?.$id || index}
                                custom={index}
                                variants={rowVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                              >
                                <td className="px-4 py-2 border">
                                  {student ? student.Name : `Unknown Student (ID: ${studentId})`}
                                </td>
                                <td className="px-4 py-2 border">{record?.Status || 'N/A'}</td>
                                <td className="px-4 py-2 border">{record?.Marked_By || 'N/A'}</td>
                                <td className="px-4 py-2 border">
                                  {record?.Latitude && record?.Longitude
                                    ? `${record.Latitude}, ${record.Longitude}`
                                    : 'N/A'}
                                </td>
                                <td className="px-4 py-2 border">
                                  <button
                                    onClick={() => handleEdit(record)}
                                    className="text-indigo-600 hover:text-indigo-800 mr-2"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(record?.$id)}
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
                  </div>
                );
              })
            )}
          </>
        )}

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
                        <option key={student?.$id} value={student?.$id}>
                          {student?.Name || 'Unknown Student'}
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
                      disabled={formData.Student_Id && students.find((s) => s?.$id === formData.Student_Id)?.Course?.$id}
                    >
                      <option value="">Select Course</option>
                      {courses.map((course) => (
                        <option key={course?.$id} value={course?.$id}>
                          {course?.Programme || 'Unknown Course'}
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
                      readOnly={showAddForm}
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