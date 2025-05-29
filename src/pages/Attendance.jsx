import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAttendance, createAttendance, updateAttendance, deleteAttendance } from '../services/attendanceService';
import { getStudents } from '../services/studentService';

function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [formData, setFormData] = useState({
    Student_Id: '',
    Status: '',
    Session_Id: '',
    Course_Id: '',
    Marked_By: '',
    Marked_at: '',
    Latitude: '',
    Longitude: ''
  });
  const modalRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [attendanceResponse, studentsResponse] = await Promise.all([
          getAttendance(),
          getStudents(),
        ]);
        setAttendanceRecords(attendanceResponse.documents);
        setStudents(studentsResponse.documents);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        },
        (error) => {
          setError('Failed to get location: ' + error.message);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const newAttendance = await createAttendance({
        ...formData,
        Marked_at: new Date(formData.Marked_at).toISOString(),
        Latitude: parseFloat(formData.Latitude),
        Longitude: parseFloat(formData.Longitude)
      });
      setAttendanceRecords([...attendanceRecords, newAttendance]);
      setShowAddForm(false);
      setFormData({
        Student_Id: '',
        Status: '',
        Session_Id: '',
        Course_Id: '',
        Marked_By: '',
        Marked_at: '',
        Latitude: '',
        Longitude: ''
      });
    } catch (err) {
      setError('Failed to add attendance: ' + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedAttendance = await updateAttendance(currentAttendance.$id, {
        ...formData,
        Marked_at: new Date(formData.Marked_at).toISOString(),
        Latitude: parseFloat(formData.Latitude),
        Longitude: parseFloat(formData.Longitude)
      });
      setAttendanceRecords(
        attendanceRecords.map((record) =>
          record.$id === currentAttendance.$id ? updatedAttendance : record
        )
      );
      setShowDetailsModal(false);
      setCurrentAttendance(null);
      setFormData({
        Student_Id: '',
        Status: '',
        Session_Id: '',
        Course_Id: '',
        Marked_By: '',
        Marked_at: '',
        Latitude: '',
        Longitude: ''
      });
    } catch (err) {
      setError('Failed to update attendance: ' + err.message);
    }
  };

  const handleShowDetails = (record) => {
    setCurrentAttendance(record);
    setFormData({
      Student_Id: record.Student_Id?.$id || '',
      Status: record.Status,
      Session_Id: record.Session_Id,
      Course_Id: record.Course_Id,
      Marked_By: record.Marked_By,
      Marked_at: record.Marked_at.slice(0, 16),
      Latitude: record.Latitude.toString(),
      Longitude: record.Longitude.toString()
    });
    setShowDetailsModal(true);
  };

  const handleDelete = async (attendanceId) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        await deleteAttendance(attendanceId);
        setAttendanceRecords(attendanceRecords.filter((record) => record.$id !== attendanceId));
      } catch (err) {
        setError('Failed to delete attendance: ' + err.message);
      }
    }
  };

  const closeModal = useCallback(() => {
    setShowAddForm(false);
    setShowDetailsModal(false);
    setCurrentAttendance(null);
    setFormData({
      Student_Id: '',
      Status: '',
      Session_Id: '',
      Course_Id: '',
      Marked_By: '',
      Marked_at: '',
      Latitude: '',
      Longitude: ''
    });
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
    if (showAddForm || showDetailsModal) {
      document.addEventListener('keydown', handleKeyDown);
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAddForm, showDetailsModal, handleKeyDown]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Attendance Management</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200"
          >
            Add Attendance
          </button>
        </div>

        {(showAddForm || showDetailsModal) && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div
              ref={modalRef}
              tabIndex={-1}
              className="bg-white p-8 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                {showDetailsModal ? 'Attendance Details' : 'Add Attendance'}
              </h3>
              {showDetailsModal && currentAttendance && !showAddForm ? (
                <div>
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Attendance Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Student Name:</span>{' '}
                        {currentAttendance.Student_Id?.Name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Marked At:</span>{' '}
                        {new Date(currentAttendance.Marked_at).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Status:</span> {currentAttendance.Status}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Session ID:</span> {currentAttendance.Session_Id}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Course ID:</span> {currentAttendance.Course_Id}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Marked By:</span> {currentAttendance.Marked_By}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Location:</span>{' '}
                        {currentAttendance.Latitude}, {currentAttendance.Longitude}
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handleEditSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                        <select
                          name="Student_Id"
                          value={formData.Student_Id}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          name="Status"
                          value={formData.Status}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        >
                          <option value="">Select Status</option>
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Session ID</label>
                        <input
                          type="text"
                          name="Session_Id"
                          value={formData.Session_Id}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course ID</label>
                        <input
                          type="text"
                          name="Course_Id"
                          value={formData.Course_Id}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marked By</label>
                        <input
                          type="text"
                          name="Marked_By"
                          value={formData.Marked_By}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marked At</label>
                        <input
                          type="datetime-local"
                          name="Marked_at"
                          value={formData.Marked_at}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          name="Latitude"
                          value={formData.Latitude}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          name="Longitude"
                          value={formData.Longitude}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Get Current Location
                      </button>
                    </div>
                    <div className="mt-8 flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-6 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
                      >
                        Update Attendance
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleAddSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                      <select
                        name="Student_Id"
                        value={formData.Student_Id}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        name="Status"
                        value={formData.Status}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required
                      >
                        <option value="">Select Status</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Session ID</label>
                      <input
                        type="text"
                        name="Session_Id"
                        value={formData.Session_Id}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Course ID</label>
                      <input
                        type="text"
                        name="Course_Id"
                        value={formData.Course_Id}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marked By</label>
                      <input
                        type="text"
                        name="Marked_By"
                        value={formData.Marked_By}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marked At</label>
                      <input
                        type="datetime-local"
                        name="Marked_at"
                        value={formData.Marked_at}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        name="Latitude"
                        value={formData.Latitude}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        name="Longitude"
                        value={formData.Longitude}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Get Current Location
                    </button>
                  </div>
                  <div className="mt-8 flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-6 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
                    >
                      Add Attendance
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Marked At</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Session ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Course ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Marked By</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Location</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendanceRecords.map((record) => (
                <tr key={record.$id} className="hover:bg-gray-50 transition-colors">
                  <td
                    className="px-6 py-4 text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    onClick={() => handleShowDetails(record)}
                  >
                    {record.Student_Id?.Name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(record.Marked_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.Status}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.Session_Id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.Course_Id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.Marked_By}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {record.Latitude}, {record.Longitude}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => handleShowDetails(record)}
                      className="text-indigo-600 hover:text-indigo-800 mr-4 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(record.$id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default Attendance;