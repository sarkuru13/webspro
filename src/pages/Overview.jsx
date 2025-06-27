import React, { useState, useEffect, useRef } from 'react';
import { getStudents } from '../services/studentService';
import { fetchCourses } from '../services/courseService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, BookOpen, CheckCircle, GraduationCap, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6EE7B7'];

function Overview({ user }) {
  const dashboardRef = useRef(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    courseDistribution: [],
    genderDistribution: [],
    statusDistribution: [],
    yearDistribution: []
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStatistics();
    }
  }, [user]);

  const fetchStatistics = async () => {
    try {
      setLoadingStats(true);
      const [studentsResponse, coursesResponse] = await Promise.all([
        getStudents(),
        fetchCourses()
      ]);

      const students = studentsResponse.documents || [];
      const courses = coursesResponse || [];

      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.Status === 'Active').length;
      
      const courseDistribution = courses.map(course => {
        const count = students.filter(s => s.Course?.$id === course.$id).length;
        return {
          name: course.Programme,
          value: count,
          percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0
        };
      }).filter(item => item.value > 0);

      const genderCounts = students.reduce((acc, student) => {
        acc[student.Gender] = (acc[student.Gender] || 0) + 1;
        return acc;
      }, {});
      const genderDistribution = Object.keys(genderCounts).map(gender => ({
        name: gender,
        value: genderCounts[gender],
        percentage: totalStudents > 0 ? Math.round((genderCounts[gender] / totalStudents) * 100) : 0
      }));

      const statusCounts = students.reduce((acc, student) => {
        acc[student.Status] = (acc[student.Status] || 0) + 1;
        return acc;
      }, {});
      const statusDistribution = Object.keys(statusCounts).map(status => ({
        name: status,
        value: statusCounts[status],
        percentage: totalStudents > 0 ? Math.round((statusCounts[status] / totalStudents) * 100) : 0
      }));

      const yearCounts = students.reduce((acc, student) => {
        if (student.Year) {
          acc[student.Year] = (acc[student.Year] || 0) + 1;
        }
        return acc;
      }, {});
      const yearDistribution = Object.keys(yearCounts).map(year => ({
        name: String(year),
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

  const handleExportPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let yOffset = 10;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(17, 24, 39); // Gray-900
    pdf.text('Admin Dashboard Report', margin, yOffset);
    yOffset += 10;

    // Summary Statistics
    pdf.setFontSize(12);
    pdf.setTextColor(107, 114, 128); // Gray-500
    pdf.text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, margin, yOffset);
    yOffset += 10;
    pdf.setTextColor(17, 24, 39);
    pdf.text(`Total Students: ${stats.totalStudents}`, margin, yOffset);
    yOffset += 7;
    pdf.text(`Active Students: ${stats.activeStudents} (${stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0}%)`, margin, yOffset);
    yOffset += 15;

    // Capture Charts
    const chartElements = [
      { id: 'course-chart', title: 'Course Distribution' },
      { id: 'gender-chart', title: 'Gender Distribution' },
      { id: 'status-chart', title: 'Status Overview' },
      { id: 'year-chart', title: 'Year-wise Distribution' }
    ];

    for (const { id, title } of chartElements) {
      const chart = document.getElementById(id);
      if (chart) {
        const canvas = await html2canvas(chart, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (yOffset + imgHeight + 20 > pageHeight) {
          pdf.addPage();
          yOffset = 10;
        }

        pdf.setFontSize(14);
        pdf.setTextColor(17, 24, 39);
        pdf.text(title, margin, yOffset);
        yOffset += 7;

        pdf.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight);
        yOffset += imgHeight + 15;

        // Add detailed data
        let data;
        switch (id) {
          case 'course-chart': data = stats.courseDistribution; break;
          case 'gender-chart': data = stats.genderDistribution; break;
          case 'status-chart': data = stats.statusDistribution; break;
          case 'year-chart': data = stats.yearDistribution; break;
        }

        if (data.length > 0) {
          pdf.setFontSize(10);
          pdf.setTextColor(107, 114, 128);
          data.forEach(item => {
            if (yOffset + 5 > pageHeight) {
              pdf.addPage();
              yOffset = 10;
            }
            pdf.text(`${item.name}: ${item.value} students (${item.percentage}%)`, margin, yOffset);
            yOffset += 5;
          });
          yOffset += 10;
        }
      }
    }

    pdf.save(`dashboard_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
          <p className="text-gray-900 font-medium">{`${label}`}</p>
          <p className="text-indigo-600">{`${payload[0].value} students`}</p>
          <p className="text-gray-500 text-sm">{`${payload[0].payload.percentage}% of total`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col animate-fade-in space-y-8" ref={dashboardRef}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome, Admin</h2>
          <p className="text-gray-600 mt-2 max-w-md">Comprehensive overview of your student management system</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
        >
          <Download className="w-5 h-5 mr-2" />
          Download PDF Report
        </button>
      </div>

      {loadingStats ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 grid grid-cols-1 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
                  <p className="text-4xl font-bold text-indigo-600 mt-2">{stats.totalStudents}</p>
                </div>
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transform hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-500 text-sm font-medium">Active Students</h3>
                  <p className="text-4xl font-bold text-green-600 mt-2">{stats.activeStudents}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0}% of total
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {stats.courseDistribution.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 lg:col-span-2 transform hover:scale-[1.02] transition-transform duration-200" id="course-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-700 font-semibold text-lg">Course Distribution</h3>
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.courseDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                    >
                      {stats.courseDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {stats.genderDistribution.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200" id="gender-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-700 font-semibold text-lg">Gender Distribution</h3>
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.genderDistribution}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fill: '#4b5563' }} />
                    <YAxis tick={{ fill: '#4b5563' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    <Bar dataKey="value" name="Students">
                      {stats.genderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {stats.statusDistribution.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200" id="status-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-700 font-semibold text-lg">Status Overview</h3>
                <CheckCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                    >
                      {stats.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Active' ? COLORS[1] : COLORS[3]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {stats.yearDistribution.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transform hover:scale-[1.02] transition-transform duration-200" id="year-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-700 font-semibold text-lg">Year-wise Distribution</h3>
                <GraduationCap className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.yearDistribution}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fill: '#4b5563' }} />
                    <YAxis tick={{ fill: '#4b5563' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    <Bar dataKey="value" name="Students" fill={COLORS[5]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Overview;