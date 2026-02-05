'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { TimeRecord } from '@/types';
import { useRouter } from 'next/navigation';

export default function ClockInOutPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        checkActiveClockIn();
    }, [userData]);

    const checkActiveClockIn = async () => {
        if (!userData) return;

        const q = query(
            collection(db, 'timeRecords'),
            where('staffId', '==', userData.id),
            where('clockOutTime', '==', null)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            setActiveRecord({ id: doc.id, ...doc.data() } as TimeRecord);
        }
        setLoading(false);
    };

    const handleClockIn = async () => {
        if (!userData) return;

        setLoading(true);

        try {
            const docRef = await addDoc(collection(db, 'timeRecords'), {
                staffId: userData.id,
                clockInTime: Timestamp.now(),
                clockOutTime: null,
                hoursWorked: null,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            showNotification('Clocked in successfully!', 'success');
            await checkActiveClockIn();
        } catch (error) {
            console.error('Error clocking in:', error);
            showNotification('Failed to clock in. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (!userData || !activeRecord) return;

        setLoading(true);

        try {
            const clockOutTime = Timestamp.now();
            const clockInTime = activeRecord.clockInTime;

            // Calculate hours worked
            const hoursWorked = (clockOutTime.toMillis() - clockInTime.toMillis()) / (1000 * 60 * 60);

            await updateDoc(doc(db, 'timeRecords', activeRecord.id!), {
                clockOutTime,
                hoursWorked,
                updatedAt: Timestamp.now(),
            });

            showNotification(`Clocked out successfully! Worked ${hoursWorked.toFixed(2)} hours`, 'success');
            setActiveRecord(null);
        } catch (error) {
            console.error('Error clocking out:', error);
            showNotification('Failed to clock out. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute requiredRole="STAFF">
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Clock</h1>
                        <p className="text-gray-600">Welcome, {userData?.name}</p>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : activeRecord ? (
                        // Clocked In State
                        <div className="text-center">
                            <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl">
                                <p className="text-sm text-gray-600 mb-2">Clocked in at</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {activeRecord.clockInTime.toDate().toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                    {activeRecord.clockInTime.toDate().toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>

                            <button
                                onClick={handleClockOut}
                                className="btn-danger py-4 text-lg"
                            >
                                Clock Out
                            </button>
                        </div>
                    ) : (
                        // Clocked Out State
                        <div className="text-center">
                            <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-xl">
                                <p className="text-gray-600">You are currently clocked out</p>
                            </div>

                            <button
                                onClick={handleClockIn}
                                className="btn-primary py-4 text-lg"
                            >
                                Clock In
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="btn-secondary mt-6"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </ProtectedRoute>
    );
}
