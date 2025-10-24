import React, { useState } from 'react';
import { Container, Form, Button, Alert, Card, Row, Col, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Home, MapPin, List, Image } from 'react-feather';

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

  const formatPrice = (value) => {
    // Remove non-numeric characters except for commas and periods
    const numericValue = value.replace(/[^0-9,.]/g, '');
    // Format with commas for thousands
    const formatted = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formatted ? `₦${formatted}` : '';
  };

  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setPrice(formatPrice(rawValue));
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create listing');
      }

      setMessage('Listing created successfully!');
      setTimeout(() => navigate('/listings'), 2000);
    } catch (err) {
      console.error('Error creating listing:', err);
      setMessage(`Failed to create listing: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-4 my-md-5">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-gradient-primary text-white">
          <h4 className="mb-0">
            <Home size={24} className="me-2" />
            Create New Listing
          </h4>
        </Card.Header>
        <Card.Body className="p-4">
          {message && (
            <Alert 
              variant={message.includes('successfully') ? 'success' : 'danger'} 
              className="mb-4"
              dismissible
              onClose={() => setMessage('')}
            >
              {message}
            </Alert>
          )}
          
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Type *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <Home size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      as="select"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      required
                      style={{ backgroundColor: '#f8f9fa' }}
                    >
                      <option value="">Select Type</option>
                      <option value="hostel">Hostel</option>
                      <option value="apartment">Apartment</option>
                    </Form.Control>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Name *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <Home size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Enter listing name (e.g., Cozy Student Hostel)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Price (e.g., ₦40,000/month) *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>₦</InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="40,000/month"
                      value={price}
                      onChange={handlePriceChange}
                      required
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Enter price in Naira (e.g., ₦40,000/month).
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Location *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <MapPin size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Enter location (e.g., Osogbo)"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Amenities (comma-separated, e.g., WiFi, Parking)</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <List size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Enter amenities"
                  value={amenities}
                  onChange={(e) => setAmenities(e.target.value)}
                  style={{ backgroundColor: '#f8f9fa' }}
                />
              </InputGroup>
              <Form.Text className="text-muted">
                Separate amenities with commas (e.g., WiFi, Parking, Water).
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Distance (e.g., 2km from UNIOSUN)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <MapPin size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Enter distance"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Payment Terms (e.g., Monthly)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>₦</InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Enter payment terms"
                      value={payment}
                      onChange={(e) => setPayment(e.target.value)}
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Images (max 5, each less than 1MB)</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <Image size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  style={{ backgroundColor: '#f8f9fa' }}
                />
              </InputGroup>
              <Form.Text className="text-muted">
                Upload up to 5 images (max 1MB each).
              </Form.Text>
            </Form.Group>

            {images.length > 0 && (
              <Card className="mb-4">
                <Card.Header>Image Preview</Card.Header>
                <Card.Body>
                  <Row className="g-2">
                    {images.map((img, index) => (
                      <Col xs={6} md={4} lg={3} key={index}>
                        <img
                          src={img}
                          alt={`Preview ${index + 1}`}
                          className="img-fluid rounded shadow-sm"
                          style={{ maxHeight: '100px', objectFit: 'cover', width: '100%' }}
                        />
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            )}

            <div className="d-flex gap-2">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading || !user}
                style={{ 
                  padding: '0.75rem 2rem',
                  transition: 'all 0.3s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                {loading ? 'Creating...' : 'Create Listing'}
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/listings')}
                style={{ 
                  padding: '0.75rem 2rem',
                  transition: 'all 0.3s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default NewListing;