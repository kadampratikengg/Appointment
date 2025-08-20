import axios from 'axios';

const initiatePayment = async ({ orderId, amount, formData, apiUrl, onSuccess, onError }) => {
  if (!window.Razorpay) {
    onError('Razorpay SDK not loaded. Please check your internet connection and try again.');
    return false;
  }

  const options = {
    key: process.env.REACT_APP_RAZORPAY_KEY,
    amount,
    currency: 'INR',
    name: 'Appointment Booking',
    description: `Booking for ${formData.time.length} slot(s)`,
    order_id: orderId,
    handler: async (response) => {
      try {
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
        onSuccess(bookingResponse);
      } catch (err) {
        console.error('Payment verification error:', err.response || err.message);
        onError('Payment verification failed. Please contact support.');
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
    onError(`Payment failed: ${response.error.description}`);
  });
  rzp.open();
  return true;
};

export default initiatePayment;