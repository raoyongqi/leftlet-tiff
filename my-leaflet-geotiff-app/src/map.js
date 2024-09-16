// src/Map.js

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import GeoTIFF from 'geotiff';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/leaflet.markercluster'; // 引入 leaflet.markercluster
import 'leaflet.chinatmsproviders/src/leaflet.ChineseTmsProviders';

const Map = ({ tiffUrl }) => {
  const mapRef = useRef(null);

  useEffect(() => {
    // 初始化 Leaflet 地图
    const map = L.map('map').setView([31.2304, 121.4737], 13); // Center on Shanghai

    // 添加高德地图底图
    L.tileLayer.chinaProvider('GaoDe.Normal.Map', {
      maxZoom: 6,
      attribution: 'Map data &copy; <a href="https://www.amap.com/">高德地图</a>'
    }).addTo(map);

    // 添加 MarkerCluster 图层
    const markers = L.markerClusterGroup();
    map.addLayer(markers);

    // 处理 GeoTIFF 文件
    const fetchAndDisplayTiff = async () => {
      try {
        const response = await fetch(tiffUrl);
        const arrayBuffer = await response.arrayBuffer();
        const geoTiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await geoTiff.getImage();
        const data = await image.readRasters();

        // 处理 TIFF 数据并将其转换为 Leaflet 图层
        // 假设 TIFF 数据是一个可以用作图层的图像数据
        const bounds = [[0, 0], [image.getHeight(), image.getWidth()]];
        const tiffImage = L.imageOverlay(
          `data:image/png;base64,${btoa(new Uint8Array(data).reduce((data, byte) => data + String.fromCharCode(byte), ''))}`,
          bounds
        ).addTo(map);

        // 设置地图视图
        map.fitBounds(bounds);
      } catch (error) {
        console.error('Error fetching or processing TIFF:', error);
      }
    };

    fetchAndDisplayTiff();

    // 清理函数
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [tiffUrl]);

  return <div id="map" style={{ height: '100vh', width: '100%' }}></div>;
};

export default Map;
