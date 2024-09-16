import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.chinatmsproviders/src/leaflet.ChineseTmsProviders';
import 'leaflet.markercluster/dist/leaflet.markercluster'; // 确保你有正确的包
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import chroma from 'chroma-js';

const App = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      initMap();
    } else if (selectedFiles.length > 0) {
      fetchAndRenderTIFF(selectedFiles[0], mapRef.current);
    }
  }, [selectedFiles]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/files');
      setFiles(response.data);
    } catch (error) {
      console.error("Error loading files:", error);
    }
    setLoading(false);
  };

  const initMap = () => {
    mapRef.current = L.map('map').setView([31.2304, 121.4737], 13);

    L.tileLayer.chinaProvider('GaoDe.Normal.Map', {
      maxZoom: 4, // 根据需要调整 maxZoom
      attribution: 'Map data &copy; <a href="https://www.amap.com/">高德地图</a>'
    }).addTo(mapRef.current);
  };

  const fetchAndRenderTIFF = async (filename, map) => {
    try {
      const response = await axios.get(`http://localhost:8000/tiff/${filename}`, {
        responseType: 'arraybuffer',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      const georaster = await parseGeoraster(response.data);

      const min = georaster.mins[0];
      const range = georaster.ranges[0];
      const scale = chroma.scale('Spectral').domain([1, 0]);

      const options = {
        pixelValuesToColorFn: (pixelValues) => {
          const pixelValue = pixelValues[0];
          if (pixelValue === 0) return null;
          const scaledPixelValue = (pixelValue - min) / range;
          return scale(scaledPixelValue).hex();
        },
        resolution: 256,
        opacity: 0.7,
        georaster: georaster
      };

      const layer = new GeoRasterLayer(options);
      layer.addTo(map);
    } catch (error) {
      console.error("Error loading TIFF:", error);
    }
  };

  const handleFileSelection = (file) => {
    setSelectedFiles((prevSelectedFiles) => {
      if (prevSelectedFiles.includes(file)) {
        return prevSelectedFiles.filter((selectedFile) => selectedFile !== file);
      } else {
        return [...prevSelectedFiles, file];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files);
    }
  };

  return (
    <div className="app-container">
      <div className="file-selection">
        <button onClick={handleSelectAll}>
          {selectedFiles.length === files.length ? 'Deselect All' : 'Select All'}
        </button>
        {loading && <p>Loading...</p>}
        {!loading && (
          <div className="scroll-container">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file)}
                    onChange={() => handleFileSelection(file)}
                  />
                  {file}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="viewer-container">
        <div id="map" style={{ height: '100vh' }}></div>
      </div>
    </div>
  );
};

export default App;
