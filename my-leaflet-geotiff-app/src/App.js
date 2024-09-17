import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.chinatmsproviders/src/leaflet.ChineseTmsProviders';
import 'leaflet.markercluster/dist/leaflet.markercluster';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import chroma from 'chroma-js';

const App = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  const mapRef = useRef(null);
  const fetchAndRenderTIFFRef = useRef(null);  // 用于保存 fetchAndRenderTIFF 函数的引用
  // 定义从绿到红的渐变
  const layerRef = useRef(null); // 用于保存 ECharts 实例
  const legendsRef = useRef(null); // 用于保存 ECharts 实例

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      initMap();
    } else if (selectedFile) {
      fetchAndRenderTIFFRef.current(selectedFile, mapRef.current);
    }
  }, [selectedFile]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/files');
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

  fetchAndRenderTIFFRef.current = async (filename, map) => {
    try {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
      // 移除现有的图例
      if (legendsRef.current) {
        document.body.removeChild(legendsRef.current);
      }

      const response = await axios.get(`http://localhost:8000/tiff/${filename}`, {
        responseType: 'arraybuffer',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      const georaster = await parseGeoraster(response.data);
    // 打印 projection 信息
    console.log(georaster.projection);
      const min = Math.min(...georaster.mins);
      const max = Math.max(...georaster.maxs);
      const scale = chroma.scale(['green', 'red']).domain([min, max]);

      const options = {
        pixelValuesToColorFn: (pixelValues) => {
          const pixelValue = pixelValues[0];
          if (pixelValue === 0) return null;
          return scale(pixelValue).hex();
        },
        resolution: 256,
        opacity: 0.7,
        georaster: georaster
      };

      const layer = new GeoRasterLayer(options);
      layer.addTo(map);
      layerRef.current = layer
      // 图例直接通过 CSS 控制位置
      const newLegendDiv = document.createElement('div');
      createFixedLegend(min, max, scale, newLegendDiv);
      legendsRef.current = newLegendDiv;
    
    } catch (error) {
      console.error("Error loading TIFF:", error);
    }
  };
  const createFixedLegend = (min, max, scale, legendDiv) => {
    legendDiv.className = 'fixed-legend';
  
    // 设置图例的样式
    legendDiv.style.position = 'fixed'; // 固定位置
    legendDiv.style.top = '800px'; // 从页面顶部向下 800px
    legendDiv.style.left = '20%'; // 从页面左侧向右 20%
    legendDiv.style.transform = 'translateX(-20%)'; // 调整以使其居中对齐
    legendDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; // 半透明背景
    legendDiv.style.padding = '0'; // 去掉内边距
    legendDiv.style.border = '1px solid #ccc'; // 边框
    legendDiv.style.maxHeight = '180px'; // 最大高度限制
    legendDiv.style.overflowY = 'auto'; // 超出部分滚动
    legendDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'; // 添加阴影效果

    // 使用 flex 布局来对齐颜色框和文本
    legendDiv.style.display = 'flex';
    legendDiv.style.flexDirection = 'column-reverse';
    legendDiv.style.alignItems = 'flex-start';
    legendDiv.style.gap = '0'; // 去掉间隙
    
    // 分成 5 个区间展示图例
    const grades = [min, (min + max) / 4, (min + max) / 2, (3 * (min + max)) / 4, max];
    


  // 遍历 grades 数组生成图例项
  grades.sort((a, b) => a - b);

  grades.forEach((grade, i) => {
    const color = getColor(grade, scale);
    const legendItem = `<div style="display: flex; align-items: center; margin: 0;">
                          <i style="background:${color}; width: 30px; height: 30px; display: inline-block; margin-right: 10px;"></i> 
                          <span style="font-size: 28px; margin: 0;">${grade.toFixed(2)} ${grades[i + 1] ? '&ndash; ' + grades[i + 1].toFixed(2) : '+'}</span>
                        </div>`;
    legendDiv.innerHTML += legendItem;
  });

    document.body.appendChild(legendDiv);
  };

  
  
  const getColor = (value, scale) => {
    // 使用和 TIFF 渲染时相同的颜色比例
    return scale(value).hex();
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
          top: '20px',
          left: '20px',
          padding: '10px 20px',
          fontSize: '36px',
          cursor: 'pointer',
          zIndex: 1000
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
