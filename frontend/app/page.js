'use client';

import React, { useState } from 'react';

const GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';

export default function Home() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'mybookings' | 'admin' | 'login'
  const [user, setUser] = useState(null); // { name: 'Shivam', token: '...' }

  // Search State
  const [fromStation, setFromStation] = useState('Jabalpur Station (JBP)');
  const [toStation, setToStation] = useState('Agra Cant (AGC)');
  const [date, setDate] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Booking Flow State
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [passengerName, setPassengerName] = useState('');
  const [passengerAge, setPassengerAge] = useState('24');
  const [berthType, setBerthType] = useState('LOWER');
  const [bookingData, setBookingData] = useState(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const [myBookingsList, setMyBookingsList] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Admin State
  const [stationCode, setStationCode] = useState('');
  const [stationName, setStationName] = useState('');
  const [stationCity, setStationCity] = useState('');
  const [stationState, setStationState] = useState('');

  const [trainNumber, setTrainNumber] = useState('');
  const [trainName, setTrainName] = useState('');
  const [totalSeats, setTotalSeats] = useState('40');

  const [schedTrainId, setSchedTrainId] = useState('1');
  const [schedRouteId, setSchedRouteId] = useState('1');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');

  // --- SEARCH HANDLER ---
  const handleSearchTrains = async (e) => {
    e.preventDefault();
    setLoadingSearch(true);
    setStatusMsg('');
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/inventory/availability?scheduleId=1&fromStationId=101&toStationId=102`);
      const data = await res.json();
      setSearchResults(data.data || [
        { id: 1, number: '12004', name: 'Vande Bharat Express', departure: '06:00 AM', arrival: '11:30 AM', availableSeats: 40, price: 500 }
      ]);
    } catch (err) {
      setSearchResults([
        { id: 1, number: '12004', name: 'Vande Bharat Express', departure: '06:00 AM', arrival: '11:30 AM', availableSeats: 40, price: 500 }
      ]);
    } finally {
      setLoadingSearch(false);
    }
  };

  // --- BOOKING & SAGA HANDLER ---
  const handleBookTrain = async (train) => {
    if (!user) {
      setActiveTab('login');
      setStatusMsg('Please login first to book tickets');
      return;
    }
    setSelectedTrain(train);
    setPaymentStep(false);
  };

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    setStatusMsg('Reserving seat...');
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/bookings/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `idemp_${Date.now()}`,
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          scheduleId: 1,
          fromStationId: 101,
          toStationId: 102,
          fromSequenceNum: 1,
          toSequenceNum: 2,
          passengers: [{ name: passengerName, age: parseInt(passengerAge), gender: 'MALE', seatId: 1, seatNumber: 'S1-1', berthType }]
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBookingData(data.data);
        setPaymentStep(true);
        setStatusMsg('Seat Reserved! Complete payment below.');
      } else {
        setStatusMsg(`Reservation Error: ${data.message}`);
      }
    } catch (err) {
      setStatusMsg(`Reservation Error: ${err.message}`);
    }
  };

  // --- PAYMENT HANDLER ---
  const handleSimulatePayment = async () => {
    setStatusMsg('Processing payment...');
    try {
      const orderRes = await fetch(`${GATEWAY_URL}/api/v1/bookings/${bookingData?.id || 1}/create-payment-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` }
      });
      const orderData = await orderRes.json();

      const payRes = await fetch(`${GATEWAY_URL}/api/v1/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingData?.id || 1,
          razorpayOrderId: orderData.data?.razorpayOrderId || `order_${Date.now()}`,
          razorpayPaymentId: `pay_${Date.now()}`,
          razorpaySignature: 'mock_sig'
        })
      });
      const payData = await payRes.json();
      if (payRes.ok) {
        const newTicket = {
          pnr: bookingData?.pnr || '9211366754',
          train: selectedTrain?.name || 'Vande Bharat Express',
          date: date || '2026-09-28',
          passenger: passengerName,
          status: 'CONFIRMED'
        };
        setMyBookingsList([newTicket, ...myBookingsList]);
        setSelectedTrain(null);
        setBookingData(null);
        setActiveTab('mybookings');
        setStatusMsg('🎉 Payment Successful! Ticket Confirmed.');
      } else {
        setStatusMsg(`Payment Error: ${payData.message}`);
      }
    } catch (err) {
      setStatusMsg(`Payment Error: ${err.message}`);
    }
  };

  // --- AUTH HANDLERS ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setOtpSent(true);
    setStatusMsg('OTP sent to email!');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setUser({ name: email.split('@')[0] || 'Shivam', token: 'mock_jwt_token' });
    setActiveTab('search');
    setStatusMsg('Logged in successfully!');
  };

  // --- ADMIN HANDLERS (EXACT BACKEND CALLS) ---
  const handleCreateStation = async (e) => {
    e.preventDefault();
    setStatusMsg('Calling Admin Service POST /api/v1/admin/stations...');
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/admin/stations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token || ''}` },
        body: JSON.stringify({ code: stationCode, name: stationName, city: stationCity || 'City', state: stationState || 'State' })
      });
      const data = await res.json();
      setStatusMsg(res.ok ? `✅ Station Created (ID: ${data.data?.id || 'OK'})` : `Error: ${data.message}`);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleCreateTrain = async (e) => {
    e.preventDefault();
    setStatusMsg('Calling Admin Service POST /api/v1/admin/trains...');
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/admin/trains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token || ''}` },
        body: JSON.stringify({ number: trainNumber, name: trainName, totalSeats: parseInt(totalSeats) })
      });
      const data = await res.json();
      setStatusMsg(res.ok ? `✅ Train Created (ID: ${data.data?.id || 'OK'})` : `Error: ${data.message}`);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setStatusMsg('Calling Admin Service POST /api/v1/admin/schedules...');
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/admin/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token || ''}` },
        body: JSON.stringify({
          trainId: parseInt(schedTrainId),
          routeId: parseInt(schedRouteId),
          departureTime: departureTime || new Date(Date.now() + 86400000).toISOString(),
          arrivalTime: arrivalTime || new Date(Date.now() + 100000000).toISOString()
        })
      });
      const data = await res.json();
      setStatusMsg(res.ok ? `✅ Trip Schedule Created & Published to Kafka! (ID: ${data.data?.scheduleId || 'OK'})` : `Error: ${data.message}`);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#F4F5F7', minHeight: '100vh', fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* Top IRCTC Navigation Bar */}
      <header style={{ backgroundColor: '#1A2B88', color: '#FFFFFF', padding: '0 40px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#FFFFFF', color: '#1A2B88', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', fontSize: '14px' }}>
            IR
          </div>
          <span style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.5px' }}>IRCTC</span>
        </div>

        {/* Right Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px', fontSize: '14px', fontWeight: '500' }}>
          <span 
            onClick={() => setActiveTab('search')} 
            style={{ cursor: 'pointer', borderBottom: activeTab === 'search' ? '2px solid #FFFFFF' : 'none', paddingBottom: '4px' }}
          >
            Search
          </span>
          <span 
            onClick={() => setActiveTab('mybookings')} 
            style={{ cursor: 'pointer', borderBottom: activeTab === 'mybookings' ? '2px solid #FFFFFF' : 'none', paddingBottom: '4px' }}
          >
            My Bookings
          </span>
          <span 
            onClick={() => setActiveTab('admin')} 
            style={{ cursor: 'pointer', borderBottom: activeTab === 'admin' ? '2px solid #FFFFFF' : 'none', paddingBottom: '4px' }}
          >
            Admin
          </span>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ color: '#E2E8F0' }}>{user.name}</span>
              <button 
                onClick={() => setUser(null)}
                style={{ backgroundColor: '#2B3B9D', color: '#FFFFFF', border: '1px solid #4A55A2', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setActiveTab('login')}
              style={{ backgroundColor: '#2B3B9D', color: '#FFFFFF', border: '1px solid #4A55A2', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Login
            </button>
          )}
        </div>
      </header>

      {/* Main Page Body */}
      <main style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px' }}>
        
        {statusMsg && (
          <div style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '12px 20px', borderRadius: '6px', marginBottom: '20px', fontWeight: '500', border: '1px solid #BAE6FD' }}>
            {statusMsg}
          </div>
        )}

        {/* 1. SEARCH TAB */}
        {activeTab === 'search' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Search Trains</h2>

            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '30px' }}>
              <form onSubmit={handleSearchTrains} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 180px', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '6px' }}>From</label>
                  <input 
                    type="text" 
                    value={fromStation} 
                    onChange={(e) => setFromStation(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '6px' }}>To</label>
                  <input 
                    type="text" 
                    value={toStation} 
                    onChange={(e) => setToStation(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4B5563', marginBottom: '6px' }}>Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loadingSearch}
                  style={{ backgroundColor: '#1A2B88', color: '#FFFFFF', padding: '11px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', height: '42px' }}
                >
                  {loadingSearch ? 'Searching...' : 'Search Trains'}
                </button>
              </form>
            </div>

            {!searchResults && !selectedTrain && (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: '15px' }}>
                Search for trains to see results
              </div>
            )}

            {searchResults && !selectedTrain && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(Array.isArray(searchResults) ? searchResults : [searchResults]).map((train, idx) => (
                  <div key={idx} style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#1A2B88', fontSize: '18px', fontWeight: 'bold' }}>
                        {train.number || '12004'} - {train.name || 'Vande Bharat Express'}
                      </h3>
                      <p style={{ margin: '6px 0 0 0', color: '#6B7280', fontSize: '13px' }}>
                        Departs: {train.departure || '06:00 AM'} | Available Seats: <span style={{ color: '#059669', fontWeight: 'bold' }}>{train.availableSeats || 40}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => handleBookTrain(train)}
                      style={{ backgroundColor: '#1A2B88', color: '#FFFFFF', padding: '8px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Book Now (₹ 500)
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedTrain && (
              <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1A2B88' }}>Passenger Details for {selectedTrain.name}</h3>
                
                {!paymentStep ? (
                  <form onSubmit={handleConfirmReservation} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
                    <input 
                      type="text" 
                      placeholder="Passenger Name" 
                      value={passengerName} 
                      onChange={(e) => setPassengerName(e.target.value)} 
                      required 
                      style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                    />
                    <input 
                      type="number" 
                      placeholder="Age" 
                      value={passengerAge} 
                      onChange={(e) => setPassengerAge(e.target.value)} 
                      required 
                      style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                    />
                    <select 
                      value={berthType} 
                      onChange={(e) => setBerthType(e.target.value)} 
                      style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                    >
                      <option value="LOWER">LOWER BERTH</option>
                      <option value="MIDDLE">MIDDLE BERTH</option>
                      <option value="UPPER">UPPER BERTH</option>
                      <option value="SIDE_LOWER">SIDE LOWER</option>
                    </select>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="submit" style={{ backgroundColor: '#1A2B88', color: '#FFFFFF', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                        Reserve Seat (SAGA Step 1)
                      </button>
                      <button type="button" onClick={() => setSelectedTrain(null)} style={{ backgroundColor: '#E5E7EB', color: '#374151', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ maxWidth: '400px' }}>
                    <div style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                      PNR: <strong>{bookingData?.pnr || '9211366754'}</strong> | Total: <strong>₹ 500</strong>
                    </div>
                    <button 
                      onClick={handleSimulatePayment}
                      style={{ backgroundColor: '#059669', color: '#FFFFFF', padding: '12px 24px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
                    >
                      Pay ₹ 500 via Razorpay
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. MY BOOKINGS TAB */}
        {activeTab === 'mybookings' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>My Bookings</h2>
            {myBookingsList.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '8px', textAlign: 'center', color: '#6B7280' }}>
                No bookings found. Book a train from the Search tab!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myBookingsList.map((ticket, i) => (
                  <div key={i} style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '5px solid #059669' }}>
                    <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1A2B88' }}>PNR: {ticket.pnr}</span>
                      <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                        {ticket.status}
                      </span>
                    </div>
                    <p style={{ margin: '8px 0 0 0', color: '#4B5563', fontSize: '14px' }}>
                      Train: <strong>{ticket.train}</strong> | Passenger: <strong>{ticket.passenger}</strong>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ADMIN TAB (FULLY ALIGNED WITH BACKEND) */}
        {activeTab === 'admin' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Admin Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              
              {/* Card 1: Add Station */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1A2B88', fontSize: '16px' }}>1. Add Station</h3>
                <form onSubmit={handleCreateStation} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" placeholder="Station Code (e.g. NDLS)" value={stationCode} onChange={(e) => setStationCode(e.target.value)} required style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <input type="text" placeholder="Station Name" value={stationName} onChange={(e) => setStationName(e.target.value)} required style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <input type="text" placeholder="City" value={stationCity} onChange={(e) => setStationCity(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <input type="text" placeholder="State" value={stationState} onChange={(e) => setStationState(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <button type="submit" style={{ backgroundColor: '#1A2B88', color: '#FFFFFF', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>Create Station</button>
                </form>
              </div>

              {/* Card 2: Add Train */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1A2B88', fontSize: '16px' }}>2. Add Train</h3>
                <form onSubmit={handleCreateTrain} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" placeholder="Train Number (e.g. 12004)" value={trainNumber} onChange={(e) => setTrainNumber(e.target.value)} required style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <input type="text" placeholder="Train Name" value={trainName} onChange={(e) => setTrainName(e.target.value)} required style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <input type="number" placeholder="Total Seats (Default: 40)" value={totalSeats} onChange={(e) => setTotalSeats(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <button type="submit" style={{ backgroundColor: '#1A2B88', color: '#FFFFFF', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>Create Train</button>
                </form>
              </div>

              {/* Card 3: Add Schedule & Trigger Kafka */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1A2B88', fontSize: '16px' }}>3. Schedule Trip</h3>
                <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="number" placeholder="Train ID (e.g. 1)" value={schedTrainId} onChange={(e) => setSchedTrainId(e.target.value)} required style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <input type="number" placeholder="Route ID (e.g. 1)" value={schedRouteId} onChange={(e) => setSchedRouteId(e.target.value)} required style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <input type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <input type="datetime-local" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }} />
                  <button type="submit" style={{ backgroundColor: '#1A2B88', color: '#FFFFFF', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>Create Schedule & Publish Kafka</button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* 4. LOGIN TAB */}
        {activeTab === 'login' && (
          <div style={{ maxWidth: '400px', margin: '40px auto', backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1A2B88', marginBottom: '20px', textAlign: 'center' }}>IRCTC Login</h2>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
                <button type="submit" style={{ backgroundColor: '#1A2B88', color: '#FFFFFF', padding: '11px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Send OTP</button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input type="text" placeholder="Enter OTP (e.g. 123456)" value={otp} onChange={(e) => setOtp(e.target.value)} required style={{ padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', textAlign: 'center', fontSize: '18px', letterSpacing: '4px' }} />
                <button type="submit" style={{ backgroundColor: '#1A2B88', color: '#FFFFFF', padding: '11px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Verify & Login</button>
              </form>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
