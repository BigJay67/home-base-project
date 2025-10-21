import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function NewListing({ user }) {
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [amenities, setAmenities] = useState('');
  const [distance, setDistance] = useState('');
  const [payment, setPayment] = useState('');
  const [images, setImages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      setMessage('Maximum 5 images allowed.');
      setImages([]);
      return;
    }
    
    const validFiles = files.filter(file => {
      if (file.size > 1024 * 1024) {
        setMessage(`File ${file.name} is too large (max 1MB each).`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        setMessage(`File ${file.name} is not an image.`);
        return false;
      }
      return true;
    });

    const imagePromises = validFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = () => {
          setMessage(`Failed to read file: ${file.name}`);
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then((imageData) => {
      setImages(imageData.filter(img => img !== null));
    });
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!user) {
    setMessage('Please log in to create a listing.');
    return;
  }

  if (!type || !name || !price || !location) {
    setMessage('Please fill in all required fields: Type, Name, Price, and Location.');
    return;
  }

  setLoading(true);
  try {
    const priceValue = parseInt(price.replace(/[^0-9]/g, '')) || 0;
    if (priceValue <= 0) {
      setMessage('Please enter a valid price.');
      setLoading(false);
      return;
    }

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    
    console.log('Sending data to backend:', {
      type,
      name,
      price,
      priceValue,
      location,
      amenities: amenities.split(',').map((item) => item.trim()).filter(Boolean),
      distance,
      payment,
      images,
      createdBy: user.uid
    });

    const response = await fetch(`${backendUrl}/api/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        name,
        price,
        priceValue,
        location,
        amenities: amenities.split(',').map((item) => item.trim()).filter(Boolean),
        distance,
        payment,
        images,
        createdBy: user.uid
      }),
    });
    
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      
      throw new Error(responseText || `HTTP error! Status: ${response.status}`);
    }
    
    if (!response.ok) {
      throw new Error(data.error || data.details || `HTTP error! Status: ${response.status}`);
    }
    
    setMessage('Listing created successfully!');
    setTimeout(() => navigate('/'), 2000);
    
  } catch (err) {
    console.error('Error creating listing:', err);
    setMessage(`Failed to create listing: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <Container className="my-5">
      <h1>Create New Listing</h1>
      {message && <Alert variant={message.includes('success') ? 'success' : 'danger'}>{message}</Alert>}
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Type *</Form.Label>
          <Form.Control
            as="select"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          >
            <option value="">Select Type</option>
            <option value="hostel">Hostel</option>
            <option value="apartment">Apartment</option>
          </Form.Control>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Name *</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter listing name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Price (e.g., ₦40,000/month) *</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Location *</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter location (e.g., Osogbo)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Amenities (comma-separated, e.g., WiFi, Parking)</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter amenities"
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Distance (e.g., 2km from UNIOSUN)</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter distance"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Payment Terms (e.g., Monthly)</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter payment terms"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Images (max 5, each less than 1MB)</Form.Label>
          <Form.Control
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
        </Form.Group>

        <Button variant="primary" type="submit" disabled={loading || !user}>
          {loading ? 'Creating...' : 'Create Listing'}
        </Button>
      </Form>
    </Container>
  );
}

export default NewListing;