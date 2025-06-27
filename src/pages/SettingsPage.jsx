import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Databases, Account } from 'appwrite';
import { fetchLocations, addLocation, updateLocation, deleteLocation } from '../services/LocationService';
import toast, { Toaster } from 'react-hot-toast';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const account = new Account(client);
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const LOCATION_COLLECTION_ID = import.meta.env.VITE_APPWRITE_LOCATION_COLLECTION_ID;

function SettingsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    async function checkAuth() {
      try {
        const currentUser = await account.get();
        if (!currentUser || !(currentUser.labels?.includes('admin') || currentUser.prefs?.role === 'admin')) {
          navigate('/');
          setIsAuthenticated(false);
          return;
        }
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
        navigate('/');
      }
    }

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribe;

    async function fetchData() {
      try {
        const locationResponse = await fetchLocations();
        setLocations(locationResponse);
        setLoading(false);

        // Subscribe to real-time updates for the location collection
        unsubscribe = client.subscribe(
          `databases.${DATABASE_ID}.collections.${LOCATION_COLLECTION_ID}.documents`,
          (response) => {
            if (response.events.includes(`databases.${DATABASE_ID}.collections.${LOCATION_COLLECTION_ID}.documents.*.create`)) {
              setLocations((prev) => [response.payload, ...prev]);
            } else if (response.events.includes(`databases.${DATABASE_ID}.collections.${LOCATION_COLLECTION_ID}.documents.*.update`)) {
              setLocations((prev) =>
                prev.map((loc) => (loc.$id === response.payload.$id ? response.payload : loc))
              );
            } else if (response.events.includes(`databases.${DATABASE_ID}.collections.${LOCATION_COLLECTION_ID}.documents.*.delete`)) {
              setLocations((prev) => prev.filter((loc) => loc.$id !== response.payload.$id));
            }
          }
        );
      } catch (err) {
        setError('Failed to fetch locations: ' + err.message);
        setLoading(false);
      }
    }

    fetchData();

    // Cleanup subscription on component unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated]);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(4));
          setLongitude(position.coords.longitude.toFixed(4));
          toast.success('Current location fetched successfully.', {
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
        },
        (err) => {
          toast.error('Failed to get current location: ' + err.message, {
            style: {
              border: '1px solid #ef4444',
              padding: '16px',
              color: '#ef4444',
              background: '#fef2f2',
            },
          });
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.', {
        style: {
          border: '1px solid #ef4444',
          padding: '16px',
          color: '#ef4444',
          background: '#fef2f2',
        },
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const locationData = {
        Latitude: parseFloat(latitude),
        Longitude: parseFloat(longitude),
      };

      if (editingLocationId) {
        await updateLocation(editingLocationId, locationData);
        toast.success('Location updated successfully.', {
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
        setEditingLocationId(null);
      } else {
        await addLocation(locationData);
        toast.success('Location added successfully.', {
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
      }
      setLatitude('');
      setLongitude('');
    } catch (err) {
      toast.error(err.message, {
        style: {
          border: '1px solid #ef4444',
          padding: '16px',
          color: '#ef4444',
          background: '#fef2f2',
        },
      });
    }
  };

  const handleEdit = (location) => {
    setLatitude(location.Latitude.toString());
    setLongitude(location.Longitude.toString());
    setEditingLocationId(location.$id);
  };

  const handleDelete = async (locationId) => {
    try {
      await deleteLocation(locationId);
      toast.success('Location deleted successfully.', {
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
      toast.error(err.message, {
        style: {
          border: '1px solid #ef4444',
          padding: '16px',
          color: '#ef4444',
          background: '#fef2f2',
        },
      });
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect handled in useEffect
  }

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
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Settings - Manage Locations
        </h2>
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col">
              <label htmlFor="latitude" className="text-sm font-medium text-gray-700">
                Latitude
              </label>
              <input
                type="number"
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
                step="any"
                className="mt-1 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter latitude (e.g., 12.9716)"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="longitude" className="text-sm font-medium text-gray-700">
                Longitude
              </label>
              <input
                type="number"
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
                step="any"
                className="mt-1 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter longitude (e.g., 77.5946)"
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Get Current Location
              </button>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {editingLocationId ? 'Update Location' : 'Add Location'}
              </button>
              {editingLocationId && (
                <button
                  type="button"
                  onClick={() => {
                    setLatitude('');
                    setLongitude('');
                    setEditingLocationId(null);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Latitude</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Longitude</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locations.map((location) => (
                <tr key={location.$id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-600">
                    {location.Latitude.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-600">
                    {location.Longitude.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => handleEdit(location)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(location.$id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
    </div>
  );
}

export default SettingsPage;