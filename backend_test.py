import requests
import json
import xml.etree.ElementTree as ET
import unittest
import os

# Get the backend URL from the frontend .env file
def get_backend_url():
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.strip().split('=')[1]
    return None

BACKEND_URL = get_backend_url()
if not BACKEND_URL:
    raise ValueError("Backend URL not found in frontend/.env")

class TestGPXGeneration(unittest.TestCase):
    
    def test_valid_gpx_generation(self):
        """Test GPX generation with valid data"""
        url = f"{BACKEND_URL}/api/generate-gpx"
        
        # Sample data with multiple points
        data = {
            "route": [[37.7749, -122.4194], [37.7849, -122.4094], [37.7949, -122.3994]],
            "runDetails": {
                "name": "Test Run",
                "date": "2026-05-29",
                "startTime": "08:00",
                "description": "Test run for GPX generation",
                "avgPace": 6.0,
                "distance": 5.2,
                "duration": 1800,
                "elevationGain": 150,
                "activityType": "run"
            }
        }
        
        response = requests.post(url, json=data)
        
        # Check status code
        self.assertEqual(response.status_code, 200, f"Expected 200 OK, got {response.status_code}")
        
        # Check content type
        self.assertEqual(response.headers.get('Content-Type'), "application/gpx+xml", 
                         "Content-Type header should be application/gpx+xml")
        
        # Check Content-Disposition header
        self.assertTrue('attachment; filename=Test_Run_2026-05-29.gpx' in response.headers.get('Content-Disposition', ''),
                       f"Content-Disposition header incorrect: {response.headers.get('Content-Disposition')}")
        
        # Verify GPX structure
        try:
            root = ET.fromstring(response.content)
            
            # Check GPX namespace
            self.assertEqual(root.tag, '{http://www.topografix.com/GPX/1/1}gpx', 
                            f"Root element should be gpx, got {root.tag}")
            
            # Check metadata
            metadata = root.find('.//{http://www.topografix.com/GPX/1/1}metadata')
            name = root.find('.//{http://www.topografix.com/GPX/1/1}name')
            self.assertIsNotNone(name, "GPX should contain a name element")
            self.assertEqual(name.text, "Test Run", f"GPX name should be 'Test Run', got {name.text}")
            
            # Check track points
            track = root.find('.//{http://www.topografix.com/GPX/1/1}trk')
            self.assertIsNotNone(track, "GPX should contain a track")
            
            segment = track.find('.//{http://www.topografix.com/GPX/1/1}trkseg')
            self.assertIsNotNone(segment, "Track should contain a segment")
            
            points = segment.findall('.//{http://www.topografix.com/GPX/1/1}trkpt')
            self.assertEqual(len(points), 3, f"Expected 3 track points, got {len(points)}")
            
            # Check first point
            first_point = points[0]
            self.assertEqual(first_point.get('lat'), '37.7749', f"First point latitude incorrect: {first_point.get('lat')}")
            self.assertEqual(first_point.get('lon'), '-122.4194', f"First point longitude incorrect: {first_point.get('lon')}")
            
            # Check that points have elevation and time
            for point in points:
                elevation = point.find('.//{http://www.topografix.com/GPX/1/1}ele')
                self.assertIsNotNone(elevation, "Track point should have elevation")
                
                time = point.find('.//{http://www.topografix.com/GPX/1/1}time')
                self.assertIsNotNone(time, "Track point should have time")
                
            print("Valid GPX generation test passed!")
            
        except ET.ParseError as e:
            self.fail(f"Response is not valid XML: {e}")
    
    def test_empty_route(self):
        """Test GPX generation with empty route (should fail)"""
        url = f"{BACKEND_URL}/api/generate-gpx"
        
        data = {
            "route": [],
            "runDetails": {
                "name": "Empty Route Test",
                "date": "2026-05-29",
                "startTime": "08:00",
                "description": "Test with empty route",
                "avgPace": 6.0,
                "distance": 5.2,
                "duration": 1800,
                "elevationGain": 150,
                "activityType": "run"
            }
        }
        
        response = requests.post(url, json=data)
        
        # Should return 400 Bad Request
        self.assertEqual(response.status_code, 400, f"Expected 400 Bad Request, got {response.status_code}")
        self.assertIn("Route must contain at least 2 points", response.text, 
                     f"Error message should mention route points requirement, got: {response.text}")
        
        print("Empty route test passed!")
    
    def test_single_point_route(self):
        """Test GPX generation with single point route (should fail)"""
        url = f"{BACKEND_URL}/api/generate-gpx"
        
        data = {
            "route": [[37.7749, -122.4194]],
            "runDetails": {
                "name": "Single Point Test",
                "date": "2026-05-29",
                "startTime": "08:00",
                "description": "Test with single point",
                "avgPace": 6.0,
                "distance": 5.2,
                "duration": 1800,
                "elevationGain": 150,
                "activityType": "run"
            }
        }
        
        response = requests.post(url, json=data)
        
        # Should return 400 Bad Request
        self.assertEqual(response.status_code, 400, f"Expected 400 Bad Request, got {response.status_code}")
        self.assertIn("Route must contain at least 2 points", response.text, 
                     f"Error message should mention route points requirement, got: {response.text}")
        
        print("Single point route test passed!")
    
    def test_invalid_data_types(self):
        """Test GPX generation with invalid data types"""
        url = f"{BACKEND_URL}/api/generate-gpx"
        
        # Invalid route format (strings instead of numbers)
        data = {
            "route": [["37.7749", "-122.4194"], ["37.7849", "-122.4094"]],
            "runDetails": {
                "name": "Invalid Data Test",
                "date": "2026-05-29",
                "startTime": "08:00",
                "description": "Test with invalid data types",
                "avgPace": "not a number",  # String instead of float
                "distance": 5.2,
                "duration": 1800,
                "elevationGain": 150,
                "activityType": "run"
            }
        }
        
        response = requests.post(url, json=data)
        
        # Should return 422 Unprocessable Entity or 400 Bad Request
        self.assertIn(response.status_code, [400, 422], 
                     f"Expected 400 or 422 error code, got {response.status_code}")
        
        print("Invalid data types test passed!")

if __name__ == "__main__":
    unittest.main()