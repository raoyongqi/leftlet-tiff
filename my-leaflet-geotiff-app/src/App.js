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
  const [selectedFile, setSelectedFile] = useState('');
  const mapRef = useRef(null);

  // 定义从绿到红的渐变
  const colorScale = chroma.scale(['green', 'red']).domain([0, 1]);

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
      // 按名称排序
      const sortedFiles = response.data.sort((a, b) => a.localeCompare(b));
      setFiles(sortedFiles);
    } catch (error) {
      console.error("Error loading files:", error);
    }
    setLoading(false);
  };
  
  const initMap = () => {
    mapRef.current = L.map('map').setView([-20.2744, 100.7751], 5);

    L.tileLayer.chinaProvider('GaoDe.Normal.Map', {
      maxZoom: 8,
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

      // 计算最小值和最大值
      const min = Math.min(...georaster.mins);
      const max = Math.max(...georaster.maxs);

      // 创建从绿色到红色的颜色渐变
      const scale = chroma.scale(['green', 'red']).domain([min, max]);

      const options = {
        pixelValuesToColorFn: (pixelValues) => {
          const pixelValue = pixelValues[0];
          if (pixelValue === 0) return null; // 可以设置透明背景
          // 映射到渐变色
          return scale(pixelValue).hex();
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
