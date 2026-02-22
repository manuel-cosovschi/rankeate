'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function BookingsPage() {
    const { user, token, loading } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState<'clubs' | 'calendar' | 'bookings'>('clubs');
    const [clubs, setClubs] = useState<any[]>([]);
    const [selectedClub, setSelectedClub] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });
    const [availability, setAvailability] = useState<any>(null);
    const [myBookings, setMyBookings] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [msg, setMsg] = useState('');
    const [bookingInProgress, setBookingInProgress] = useState(false);
    const [payingBookingId, setPayingBookingId] = useState<number | null>(null);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        loadClubs();
        if (token) loadMyBookings();
    }, [token]);

    async function loadClubs() {
        try {
            const data = await api.getBookableClubs();
            setClubs(data);
        } catch { }
    }

    async function loadMyBookings() {
        try {
            const data = await api.getMyBookings(token!);
            setMyBookings(data);
        } catch { }
    }

    async function loadAvailability(clubId: number, date: string) {
        try {
            setLoadingData(true);
            const data = await api.getAvailability(clubId, date);
            setAvailability(data);
        } catch (e: any) {
            setMsg(e.message);
        } finally {
            setLoadingData(false);
        }
    }

    function selectClub(club: any) {
        setSelectedClub(club);
        setStep('calendar');
        loadAvailability(club.id, selectedDate);
    }

    function changeDate(date: string) {
        setSelectedDate(date);
        if (selectedClub) loadAvailability(selectedClub.id, date);
    }

    // Navigate dates
    function prevDay() {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        if (d >= new Date(new Date().toISOString().split('T')[0])) changeDate(d.toISOString().split('T')[0]);
    }
    function nextDay() {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        const max = new Date();
        max.setDate(max.getDate() + 14);
        if (d <= max) changeDate(d.toISOString().split('T')[0]);
    }

    async function handleBook(courtId: number, startTime: string, endTime: string) {
        if (!token) { router.push('/login'); return; }
        setBookingInProgress(true);
        try {
            await api.createBooking(token, {
                courtId,
                date: selectedDate,
                startTime,
                endTime,
            });
            setMsg('✅ Reserva creada exitosamente. Tenés 10 minutos para confirmar.');
            loadAvailability(selectedClub.id, selectedDate);
            loadMyBookings();
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        } finally {
            setBookingInProgress(false);
        }
    }

    async function handleCancel(bookingId: number) {
        if (!confirm('¿Cancelar esta reserva?')) return;
        try {
            await api.cancelBooking(token!, bookingId);
            setMsg('Reserva cancelada');
            loadMyBookings();
            if (selectedClub) loadAvailability(selectedClub.id, selectedDate);
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        }
    }

    async function handlePay(bookingId: number) {
        if (!token) return;
        setPayingBookingId(bookingId);
        try {
            const result = await api.createPaymentPreference(token, bookingId);
            if (result.free) {
                setMsg('✅ Reserva confirmada (sin costo)');
                loadMyBookings();
            } else if (result.preferenceUrl?.includes('mock=true')) {
                // Mock mode: auto-confirm
                await api.mockConfirmPayment(token, result.paymentId);
                setMsg('✅ Pago mock confirmado, reserva confirmada');
                loadMyBookings();
            } else if (result.preferenceUrl) {
                // Redirect to MP checkout
                window.location.href = result.preferenceUrl;
            }
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        } finally {
            setPayingBookingId(null);
        }
    }

    const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const formatPrice = (cents: number) => cents > 0 ? `$${(cents / 100).toLocaleString('es-AR')}` : 'Gratis';

    const STATUS_LABELS: Record<string, { label: string; color: string }> = {
        PENDING: { label: 'Pendiente', color: 'var(--warning)' },
        CONFIRMED: { label: 'Confirmada', color: 'var(--success)' },
        CANCELLED: { label: 'Cancelada', color: 'var(--text-muted)' },
        EXPIRED: { label: 'Expirada', color: 'var(--text-muted)' },
        NO_SHOW: { label: 'No presentado', color: 'var(--danger)' },
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <main className="container" style={{ padding: 'var(--space-xl) var(--space-md)', maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h1>🎾 Reservar Cancha</h1>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className={`btn ${step === 'bookings' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                        onClick={() => setStep('bookings')}>
                        Mis Reservas ({myBookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED').length})
                    </button>
                    {step !== 'clubs' && <button className="btn btn-ghost btn-sm" onClick={() => { setStep('clubs'); setSelectedClub(null); }}>← Clubes</button>}
                </div>
            </div>

            {msg && <div className={`alert ${msg.includes('Error') ? 'alert-error' : 'alert-success'}`} onClick={() => setMsg('')} style={{ marginBottom: 'var(--space-md)', cursor: 'pointer' }}>{msg}</div>}

            {/* STEP 1: Select Club */}
            {step === 'clubs' && (
                <div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>Seleccioná un club para ver disponibilidad:</p>
                    {clubs.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                            No hay clubes con canchas disponibles aún.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                            {clubs.map(club => (
                                <div key={club.id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                                    onClick={() => selectClub(club)}
                                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
                                    <h3 className="card-title">{club.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{club.address}</p>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                        <span className="badge">{club.locality?.name}</span>
                                        <span className="badge badge-success">{club._count?.courts || 0} cancha(s)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: Calendar */}
            {step === 'calendar' && selectedClub && (
                <div>
                    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 className="card-title">{selectedClub.name}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{selectedClub.address}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-ghost btn-sm" onClick={prevDay}>←</button>
                                <input type="date" className="form-input" value={selectedDate} onChange={e => changeDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    max={(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })()}
                                    style={{ width: '160px' }} />
                                <button className="btn btn-ghost btn-sm" onClick={nextDay}>→</button>
                            </div>
                        </div>
                        <p style={{ marginTop: 'var(--space-xs)', color: 'var(--primary)', fontWeight: 600, textTransform: 'capitalize' }}>
                            {formatDate(selectedDate)}
                        </p>
                    </div>

                    {loadingData ? (
                        <div className="loading"><div className="spinner" /></div>
                    ) : availability?.courts?.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            No hay canchas disponibles para esta fecha.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                            {availability?.courts?.map((court: any) => (
                                <div key={court.courtId} className="card">
                                    <h3 className="card-title" style={{ marginBottom: 'var(--space-sm)' }}>
                                        {court.courtName}
                                        <span style={{ fontWeight: 400, fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginLeft: 'var(--space-sm)' }}>
                                            {court.isIndoor ? '🏠 Techada' : '☀️ Aire libre'} · {court.surface === 'CESPED_SINTETICO' ? 'Césped' : court.surface === 'CEMENTO' ? 'Cemento' : court.surface === 'CRISTAL' ? 'Cristal' : court.surface}
                                        </span>
                                    </h3>
                                    {court.slots.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Cerrada este día</p>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                                            {court.slots.map((slot: any, idx: number) => (
                                                <button
                                                    key={idx}
                                                    className={`btn btn-sm ${slot.available ? 'btn-primary' : 'btn-ghost'}`}
                                                    disabled={!slot.available || bookingInProgress}
                                                    onClick={() => handleBook(court.courtId, slot.startTime, slot.endTime)}
                                                    style={{
                                                        minWidth: '90px',
                                                        opacity: slot.available ? 1 : 0.35,
                                                        cursor: slot.available ? 'pointer' : 'not-allowed',
                                                        ...(slot.available ? {} : { textDecoration: 'line-through' }),
                                                    }}
                                                    title={slot.available ? `${formatPrice(slot.price)}` : 'No disponible'}
                                                >
                                                    {slot.startTime}
                                                    {slot.available && slot.price > 0 && (
                                                        <span style={{ fontSize: '0.65em', display: 'block', opacity: 0.7 }}>{formatPrice(slot.price)}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MY BOOKINGS */}
            {step === 'bookings' && (
                <div>
                    <h2 style={{ marginBottom: 'var(--space-md)' }}>Mis Reservas</h2>
                    {myBookings.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                            No tenés reservas. <button className="btn btn-primary btn-sm" style={{ marginLeft: 'var(--space-sm)' }} onClick={() => setStep('clubs')}>Reservar ahora</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                            {myBookings.map(b => {
                                const status = STATUS_LABELS[b.status] || { label: b.status, color: 'var(--text-muted)' };
                                return (
                                    <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{b.club?.name} — {b.court?.name}</div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                {new Date(b.startAt).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                {' · '}
                                                {new Date(b.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {b.totalPrice > 0 && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{formatPrice(b.totalPrice)}</div>}
                                            {b.status === 'PENDING' && b.expiresAt && (
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--warning)', marginTop: '2px' }}>
                                                    ⏱ Expira: {new Date(b.expiresAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            <span className="badge" style={{ background: status.color, color: 'white' }}>{status.label}</span>
                                            {b.status === 'PENDING' && b.totalPrice > 0 && (
                                                <button className="btn btn-primary btn-sm" disabled={payingBookingId === b.id} onClick={() => handlePay(b.id)}>
                                                    {payingBookingId === b.id ? '...' : '💳 Pagar'}
                                                </button>
                                            )}
                                            {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(b.id)}>Cancelar</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
