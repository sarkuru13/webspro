import React, { useState, useEffect } from 'react';
import { getCurrentUser, logout } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import Students from './Students';
import Courses from './Courses';
import Attendance from './Attendance';
import ErrorBoundary from './ErrorBoundary';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getStudents } from '../services/studentService';
import { fetchCourses } from '../services/courseService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    courseDistribution: [],
    genderDistribution: [],
    statusDistribution: [],
    yearDistribution: []
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !(currentUser.labels?.includes('admin') || currentUser.prefs?.role === 'admin')) {
          navigate('/');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking auth:', error.message);
        navigate('/');
      }
    }
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!activeSection) {
      fetchStatistics();
    }
  }, [activeSection]);

  const fetchStatistics = async () => {
    try {
      setLoadingStats(true);
      const [studentsResponse, coursesResponse] = await Promise.all([
        getStudents(),
        fetchCourses()
      ]);

      const students = studentsResponse.documents;
      const courses = coursesResponse;

      // Calculate statistics
      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.Status === 'Active').length;
      
      // Course distribution
      const courseDistribution = courses.map(course => {
        const count = students.filter(s => s.Course?.$id === course.$id).length;
        return {
          name: course.Programme,
          value: count,
          percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0
        };
      }).filter(item => item.value > 0);

      // Gender distribution
      const genderCounts = students.reduce((acc, student) => {
        acc[student.Gender] = (acc[student.Gender] || 0) + 1;
        return acc;
      }, {});
      const genderDistribution = Object.keys(genderCounts).map(gender => ({
        name: gender,
        value: genderCounts[gender],
        percentage: totalStudents > 0 ? Math.round((genderCounts[gender] / totalStudents) * 100) : 0
      }));

      // Status distribution
      const statusCounts = students.reduce((acc, student) => {
        acc[student.Status] = (acc[student.Status] || 0) + 1;
        return acc;
      }, {});
      const statusDistribution = Object.keys(statusCounts).map(status => ({
        name: status,
        value: statusCounts[status],
        percentage: totalStudents > 0 ? Math.round((statusCounts[status] / totalStudents) * 100) : 0
      }));

      // Year distribution
      const yearCounts = students.reduce((acc, student) => {
        if (student.Year) {
          acc[student.Year] = (acc[student.Year] || 0) + 1;
        }
        return acc;
      }, {});
      const yearDistribution = Object.keys(yearCounts).map(year => ({
        name: year,
        value: yearCounts[year],
        percentage: totalStudents > 0 ? Math.round((yearCounts[year] / totalStudents) * 100) : 0
      }));

      setStats({
        totalStudents,
        activeStudents,
        courseDistribution,
        genderDistribution,
        statusDistribution,
        yearDistribution
      });
      setLoadingStats(false);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
  };

  const renderContent = () => {
    if (!activeSection) {
      return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)]">
          <div className="p-6 animate-fade-in">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome, Admin</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-md">
              Here's an overview of your student data.
            </p>
            
            {loadingStats ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
                    <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.totalStudents}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Active Students</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeStudents}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0}% of total
                    </p>
                  </div>
                </div>

                {/* Charts */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <h3 className="text-gray-700 font-medium mb-4">Course Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.courseDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                        >
                          {stats.courseDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props) => [`${value} students`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <h3 className="text-gray-700 font-medium mb-4">Gender Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.genderDistribution}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} students`]} />
                        <Bar dataKey="value" name="Students" fill="#8884d8">
                          {stats.genderDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <h3 className="text-gray-700 font-medium mb-4">Status Overview</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                        >
                          {stats.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#00C49F' : '#FF8042'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props) => [`${value} students`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {stats.yearDistribution.length > 0 && (
                  <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className="text-gray-700 font-medium mb-4">Year-wise Distribution</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.yearDistribution}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} students`]} />
                          <Bar dataKey="value" name="Students" fill="#82CA9D" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'students':
        return (
          <ErrorBoundary>
            <Students />
          </ErrorBoundary>
        );
      case 'attendance':
        return (
          <ErrorBoundary>
            <Attendance />
          </ErrorBoundary>
        );
      case 'courses':
        return (
          <ErrorBoundary>
            <Courses />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
          <div className="text-gray-900 text-xl font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar (same as before) */}
      {/* ... existing sidebar code ... */}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header for Mobile (same as before) */}
        {/* ... existing mobile header code ... */}

        {/* Content Area */}
        <main className="flex-1">{renderContent()}</main>
      </div>

      {/* Overlay for mobile sidebar (same as before) */}
      {/* ... existing overlay code ... */}

      {/* Global Styles for Animations (same as before) */}
      {/* ... existing style code ... */}
    </div>
  );
}

export default Dashboard;