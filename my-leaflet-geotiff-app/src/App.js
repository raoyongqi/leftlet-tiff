// src/App.js

import React from 'react';
import Map from './map';

const App = () => {
  // 替换为你的 TIFF 文件 URL
  const tiffUrl = 'path/to/your/file.tif';

  return (
    <div className="App">
      <Map tiffUrl={tiffUrl} />
    </div>
  );
};

export default App;
