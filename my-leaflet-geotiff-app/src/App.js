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
  const [selectedFile, setSelectedFile] = useState(''); // 改为单选
  const mapRef = useRef(null);

  // 统一的颜色映射范围
  const GLOBAL_MIN = 0; // 根据需要调整
  const GLOBAL_MAX = 100; // 根据需要调整
  const colorScale = chroma.scale('Spectral').domain([GLOBAL_MIN, GLOBAL_MAX]);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      initMap();
    } else if (selectedFile) {
      fetchAndRenderTIFF(selectedFile, mapRef.current);
    }
  }, [selectedFile]);

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
    mapRef.current = L.map('map').setView([31.2304, 121.4737], 5);

    L.tileLayer.chinaProvider('GaoDe.Normal.Map', {
      maxZoom: 8, // 根据需要调整 maxZoom
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

      const options = {
        pixelValuesToColorFn: (pixelValues) => {
          const pixelValue = pixelValues[0];
          if (pixelValue === 0) return null; // 可以设置透明背景
          const scaledPixelValue = (pixelValue - GLOBAL_MIN) / (GLOBAL_MAX - GLOBAL_MIN);
          return colorScale(scaledPixelValue).hex();
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

  const handleFileSelection = (event) => {
    setSelectedFile(event.target.value);
  };

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <select 
        value={selectedFile} 
        onChange={handleFileSelection}
        style={{
          position: 'absolute',
          top: '20px', // 按钮距离顶部的距离
          left: '20px', // 按钮距离左边的距离
          padding: '10px 20px', // 增加按钮的 padding
          fontSize: '36px', // 增加按钮的字体大小
          cursor: 'pointer',
          zIndex: 1000 // 确保按钮在地图上层
        }}
      >
        <option value="">Select a file</option>
        {files.map((file, index) => (
          <option key={index} value={file}>
            {file}
          </option>
        ))}
      </select>
      {loading && <p>Loading...</p>}
      <div id="map" style={{ height: '100vh' }}></div>
    </div>
  );
  
};

export default App;
