import React, { useEffect } from 'react';
import * as L from 'leaflet';
import chroma from 'chroma-js';
import './Legend.css'; // 引入图例的 CSS 文件

const Legend = ({ map }) => {
  useEffect(() => {
    if (!map) return;

    // 图例的颜色渐变
    const colorScale = chroma.scale(['green', 'red']).domain([0, 1]);

    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'info legend');
      const grades = [0, 0.25, 0.5, 0.75, 1];
      const labels = [];

      grades.forEach((grade) => {
        const color = colorScale(grade).hex();
        labels.push(
          `<i style="background:${color}"></i> ${Math.round(grade * 100)}%`
        );
      });

      div.innerHTML = labels.join('<br>');
      return div;
    };

    legend.addTo(map);

    // 清理图例
    return () => {
      map.removeControl(legend);
    };
  }, [map]);

  return null;
};

export default Legend;
