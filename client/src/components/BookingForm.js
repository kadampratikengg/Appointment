import { useState, useEffect } from 'react';
import axios from 'axios';
import './BookingForm.css';

function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    area: '',
    date: '',
    time: [],
    remark: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTimeSelect = (time) => {
    if (bookedSlots.includes(time)) {
      setError('This time slot is already booked.');
      return;
    }
    setFormData((prev) => {
      const newTimes = prev.time.includes(time)
        ? prev.time.filter((t) => t !== time)
        : [...prev.time, time];
      return { ...prev, time: newTimes };
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.time.length === 0) {
      setError('Please select at least one time slot.');
      return;
    }
    try {
      // Step 1: Create Razorpay order
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      console.log('API URL for create-order:', `${apiUrl}/appointments/create-order`);
      const slotPrice = parseInt(process.env.REACT_APP_SLOT_PRICE) || 20;
      const orderResponse = await axios.post(
        `${apiUrl}/appointments/create-order`,
        {
          amount: formData.time.length * slotPrice * 100, // Convert to paise
          currency: 'INR',
          slots: formData.time,
          date: formData.date,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Order Response:', orderResponse.data);
      const { orderId } = orderResponse.data;

      // Step 2: Initialize Razorpay payment
      if (!window.Razorpay) {
        setError('Razorpay SDK not loaded. Please check your internet connection and try again.');
        return;
      }
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY,
        amount: formData.time.length * slotPrice * 100, // Convert to paise
        currency: 'INR',
        name: 'Appointment Booking',
        description: `Booking for ${formData.time.length} slot(s)`,
        order_id: orderId,
        handler: async (response) => {
          try {
            // Step 3: Verify payment and book appointment
            console.log('Payment Response:', response);
            const verifyUrl = `${apiUrl}/appointments/verify-payment`;
            const bookingResponse = await axios.post(
              verifyUrl,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                formData,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            console.log('Booking Response:', bookingResponse.data);
            setSuccess('Appointment booked successfully!');
            setBookedSlots([...bookedSlots, ...formData.time]);
            setFormData({
              name: '',
              email: '',
              contactNumber: '',
              area: '',
              date: '',
              time: [],
              remark: '',
            });
            setError('');
          } catch (err) {
            console.error('Payment verification error:', err.response || err.message);
            setError('Payment verification failed. Please contact support.');
            setSuccess('');
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.contactNumber,
        },
        theme: {
          color: '#3399cc',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        console.error('Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err) {
      console.error('Error initiating payment:', err.response || err.message);
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'Failed to initiate payment. Please try again.';
      setError(errorMessage);
      setSuccess('');
    }
  };

  useEffect(() => {
    if (formData.date) {
      const fetchBookedSlots = async () => {
        try {
          const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/appointments?date=${formData.date}`;
          console.log('Fetching booked slots from:', apiUrl);
          const response = await axios.get(apiUrl, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('Booked slots:', response.data);
          setBookedSlots(response.data);
        } catch (err) {
          console.error('Error fetching booked slots:', err.response || err.message);
          const errorMessage =
            err.response?.data?.error ||
            err.message ||
            'Failed to load booked slots. Please try again.';
          setError(errorMessage);
        }
      };
      fetchBookedSlots();
    } else {
      setBookedSlots([]);
    }
  }, [formData.date]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const timeOptions = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      if (hour === 18 && minute > 30) break;
      const isPM = hour >= 12;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayTime = `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
      const valueTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push({ value: valueTime, label: displayTime });
    }
  }

  return (
    <div className='booking-form-container'>
      <h2 className='text-2xl font-semibold mb-4'>Book Appointment</h2>
      {error && <p className='error mb-4'>{error}</p>}
      {success && (
        <div className='success fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white p-4 rounded-md shadow-lg'>
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium'>Name</label>
          <input
            type='text'
            name='name'
            value={formData.name}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium'>Email</label>
          <input
            type='email'
            name='email'
            value={formData.email}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium'>Contact Number</label>
          <input
            type='tel'
            name='contactNumber'
            value={formData.contactNumber}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            pattern='\+[0-9]{10,15}'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium'>Location</label>
          <select
            name='area'
            value={formData.area}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            required
          >
            <option value='' disabled>
              Select an option
            </option>
            <option value='Remote'>Remote</option>
            <option value='Office'>Office</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium'>Date</label>
          <input
            type='date'
            name='date'
            value={formData.date}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium'>Time Slots</label>
          <div className='time-table-container'>
            <table className='time-table'>
              <tbody>
                {Array.from({ length: Math.ceil(timeOptions.length / 4) }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {timeOptions.slice(rowIndex * 4, rowIndex * 4 + 4).map((option) => (
                      <td
                        key={option.value}
                        className={`time-slot ${formData.time.includes(option.value) ? 'selected' : ''} ${
                          bookedSlots.includes(option.value) ? 'booked' : ''
                        }`}
                        onClick={() => handleTimeSelect(option.value)}
                      >
                        {option.label}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <label className='block text-sm font-medium'>Remark</label>
          <textarea
            name='remark'
            value={formData.remark}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            rows='4'
          />
        </div>
        <div>
          <p className='text-sm font-medium'>
            Total: ₹{(formData.time.length * (parseInt(process.env.REACT_APP_SLOT_PRICE) || 20)).toFixed(2)}
          </p>
        </div>
        <button
          type='submit'
          className='w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600'
        >
          Proceed to Payment
        </button>
      </form>
      <div className='mt-4 text-center'>
        <a
          href='https://api.whatsapp.com/send?phone=YOUR_PHONE_NUMBER&text=Hello! I have a question about my appointment.'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'
        >
          Contact Us on WhatsApp
        </a>
      </div>
    </div>
  );
}

export default BookingForm;