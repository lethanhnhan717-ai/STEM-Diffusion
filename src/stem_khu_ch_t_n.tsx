import React, { useState, useEffect, useMemo, useRef } from 'react';
import PlotComponent from 'react-plotly.js';
const Plot = PlotComponent as any;
import { 
  Menu, Play, Pause, BookOpen, Activity, 
  Layers, Wind, AlertTriangle, Video, Info, X
} from 'lucide-react';

// --- MATH UTILITIES (Numpy Replacements) ---

// Standard Normal variate using Box-Muller transform
function randn_bm() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// 2D Continuous Simulation
function run_simulation_2d(N, steps, D, vx, vy, dt) {
  const x = Array.from({ length: N }, () => new Float32Array(steps));
  const y = Array.from({ length: N }, () => new Float32Array(steps));
  const sqrt2Ddt = Math.sqrt(2 * D * dt);
  
  for (let i = 0; i < N; i++) {
    x[i][0] = 0; y[i][0] = 0;
    for (let t = 1; t < steps; t++) {
      x[i][t] = x[i][t - 1] + vx * dt + sqrt2Ddt * randn_bm();
      y[i][t] = y[i][t - 1] + vy * dt + sqrt2Ddt * randn_bm();
    }
  }
  return { x, y };
}

// 3D Continuous Simulation
function run_simulation_3d(N, steps, D, vx, vy, vz, dt) {
  const x = Array.from({ length: N }, () => new Float32Array(steps));
  const y = Array.from({ length: N }, () => new Float32Array(steps));
  const z = Array.from({ length: N }, () => new Float32Array(steps));
  const sqrt2Ddt = Math.sqrt(2 * D * dt);
  
  for (let i = 0; i < N; i++) {
    x[i][0] = 0; y[i][0] = 0; z[i][0] = 0;
    for (let t = 1; t < steps; t++) {
      x[i][t] = x[i][t - 1] + vx * dt + sqrt2Ddt * randn_bm();
      y[i][t] = y[i][t - 1] + vy * dt + sqrt2Ddt * randn_bm();
      z[i][t] = z[i][t - 1] + vz * dt + sqrt2Ddt * randn_bm();
    }
  }
  return { x, y, z };
}

// 1D Discrete Random Walk
function run_discrete_rw_1d(N, steps) {
  const x = Array.from({ length: N }, () => new Int32Array(steps));
  for (let i = 0; i < N; i++) {
    x[i][0] = 0;
    for (let t = 1; t < steps; t++) {
      const dx = Math.random() < 0.5 ? -1 : 1;
      x[i][t] = x[i][t - 1] + dx;
    }
  }
  return { x };
}

// 2D Discrete Random Walk
function run_discrete_rw_2d(N, steps) {
  const x = Array.from({ length: N }, () => new Int32Array(steps));
  const y = Array.from({ length: N }, () => new Int32Array(steps));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  for (let i = 0; i < N; i++) {
    x[i][0] = 0; y[i][0] = 0;
    for (let t = 1; t < steps; t++) {
      const dir = dirs[Math.floor(Math.random() * 4)];
      x[i][t] = x[i][t - 1] + dir[0];
      y[i][t] = y[i][t - 1] + dir[1];
    }
  }
  return { x, y };
}

// 3D Discrete Random Walk
function run_discrete_rw_3d(N, steps) {
  const x = Array.from({ length: N }, () => new Int32Array(steps));
  const y = Array.from({ length: N }, () => new Int32Array(steps));
  const z = Array.from({ length: N }, () => new Int32Array(steps));
  const dirs = [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]];
  
  for (let i = 0; i < N; i++) {
    x[i][0] = 0; y[i][0] = 0; z[i][0] = 0;
    for (let t = 1; t < steps; t++) {
      const dir = dirs[Math.floor(Math.random() * 6)];
      x[i][t] = x[i][t - 1] + dir[0];
      y[i][t] = y[i][t - 1] + dir[1];
      z[i][t] = z[i][t - 1] + dir[2];
    }
  }
  return { x, y, z };
}

// Helper for 2D Surface Histogram
function generate2DSurface(x_final, y_final, bins=30, range=[-30, 30]) {
  const z = Array(bins).fill(0).map(() => Array(bins).fill(0));
  const step = (range[1] - range[0]) / bins;
  const x_centers = Array(bins).fill(0).map((_, i) => range[0] + step * (i + 0.5));
  const y_centers = Array(bins).fill(0).map((_, i) => range[0] + step * (i + 0.5));
  
  for (let i = 0; i < x_final.length; i++) {
    const bx = Math.floor((x_final[i] - range[0]) / step);
    const by = Math.floor((y_final[i] - range[0]) / step);
    if (bx >= 0 && bx < bins && by >= 0 && by < bins) {
      z[by][bx] += 1; // Transposed for Plotly surface (y is outer, x is inner)
    }
  }
  return { z, x: x_centers, y: y_centers };
}

// UI Components
const InfoBox = ({ children }) => (
  <div className="bg-[#eef2f5] p-5 rounded-lg border-l-4 border-[#4ECDC4] mb-5 text-gray-800">
    {children}
  </div>
);

const MathBox = ({ children }: { children?: any }) => (
  <div className="bg-[#f8f9fa] p-4 rounded-lg border border-gray-200 my-4 text-center overflow-x-auto text-lg font-serif italic text-gray-800">
    {children}
  </div>
);

const Metric = ({ label, value, subtext }: { label: any; value: any; subtext?: any }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col">
    <span className="text-sm text-gray-500 font-medium mb-1">{label}</span>
    <span className="text-2xl font-bold text-gray-800">{value}</span>
    {subtext && <span className="text-xs text-gray-400 mt-1">{subtext}</span>}
  </div>
);

const Page0 = () => {
  const [dim, setDim] = useState("1 Chiều (1D - 2 hướng)");
  const [N, setN] = useState(3);
  const [steps, setSteps] = useState(100);
  const [speed, setSpeed] = useState(2);
  const [tab, setTab] = useState('static');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);

  const data = useMemo(() => {
    if (dim.includes("1D")) return run_discrete_rw_1d(N, steps);
    if (dim.includes("2D")) return run_discrete_rw_2d(N, steps);
    return run_discrete_rw_3d(N, steps);
  }, [dim, N, steps]);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setFrame(f => (f + speed >= steps ? 0 : f + speed));
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, steps]);

  useEffect(() => {
    setFrame(steps - 1);
    setIsPlaying(false);
  }, [data, tab, steps]);

  const currentFrame = tab === 'static' ? steps - 1 : frame;

  const renderPlot = () => {
    const t_data = Array.from({length: currentFrame + 1}, (_, i) => i);
    
    const d = data as any;
    if (dim.includes("1D")) {
      const traces: any[] = d.x.map((traj: any) => ({
        x: t_data,
        y: traj.slice(0, currentFrame + 1),
        mode: 'lines',
        line: { width: 2 },
        opacity: 0.8,
        showlegend: false
      }));
      return <Plot data={traces} layout={{ title: "Quỹ đạo các hạt (1D)", xaxis: { title: "Thời gian (bước)", range: [0, steps] }, yaxis: { title: "Vị trí X" }, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    } 
    else if (dim.includes("2D")) {
      const max_val = Math.max(Math.max(...d.x.map((t: any)=>Math.max(...t.map(Math.abs)))), Math.max(...d.y.map((t: any)=>Math.max(...t.map(Math.abs))))) + 2;
      const traces: any[] = d.x.map((traj: any, i: number) => ({
        x: traj.slice(0, currentFrame + 1),
        y: d.y[i].slice(0, currentFrame + 1),
        mode: 'lines', line: { width: 2 }, opacity: 0.7, showlegend: false
      }));
      traces.push({ x: [0], y: [0], mode: 'markers', marker: { color: 'red', size: 12, symbol: 'star' }, name: 'Nguồn' });
      return <Plot data={traces} layout={{ title: "Quỹ đạo (2D - Rời rạc)", xaxis: { title: "Trục X", range: [-max_val, max_val], zeroline: false }, yaxis: { title: "Trục Y", range: [-max_val, max_val], zeroline: false }, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    } 
    else {
      const max_val = Math.max(...[d.x, d.y, d.z].flat(2).map(Math.abs)) + 2;
      const traces: any[] = d.x.map((traj: any, i: number) => ({
        x: traj.slice(0, currentFrame + 1),
        y: d.y[i].slice(0, currentFrame + 1),
        z: d.z[i].slice(0, currentFrame + 1),
        type: 'scatter3d', mode: 'lines', line: { width: 3 }, opacity: 0.8, showlegend: false
      }));
      traces.push({ x: [0], y: [0], z: [0], type: 'scatter3d', mode: 'markers', marker: { color: 'red', size: 8, symbol: 'diamond' }, name: 'Nguồn' });
      return <Plot data={traces} layout={{ title: "Quỹ đạo (3D - Rời rạc)", scene: { xaxis: { range: [-max_val, max_val], title: 'X' }, yaxis: { range: [-max_val, max_val], title: 'Y' }, zaxis: { range: [-max_val, max_val], title: 'Z' } }, template: 'plotly_dark', autosize: true, margin: {l:0, r:0, t:40, b:0} }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    }
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-bold mb-4 flex items-center text-gray-800"><Activity className="mr-2 text-[#4ECDC4]" /> Bài 0: Bước Đi Ngẫu Nhiên Rời Rạc</h2>
      <InfoBox>
        <b>Mô hình Bước Đi Rời Rạc (Discrete Random Walk)</b> là cách đơn giản nhất để hiểu về chuyển động ngẫu nhiên. Thay vì di chuyển liên tục, hạt sẽ thực hiện từng bước nhảy một cách rời rạc trên một lưới tọa độ.
      </InfoBox>

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <div className="w-full lg:w-1/3 bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold mb-4 border-b pb-2 text-gray-700">⚙️ Thông số</h3>
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Không gian</label>
          <select value={dim} onChange={e=>setDim(e.target.value)} className="w-full p-2 border rounded-md mb-4 bg-gray-50 focus:ring-[#4ECDC4] focus:border-[#4ECDC4]">
            <option>1 Chiều (1D - 2 hướng)</option>
            <option>2 Chiều (2D - 4 hướng)</option>
            <option>3 Chiều (3D - 6 hướng)</option>
          </select>

          <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng hạt: {N}</label>
          <input type="range" min="1" max="50" value={N} onChange={e=>setN(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />

          <label className="block text-sm font-medium text-gray-700 mb-1">Số bước thời gian: {steps}</label>
          <input type="range" min="10" max="500" value={steps} onChange={e=>setSteps(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />

          {tab === 'anim' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tốc độ Animation: {speed}</label>
              <input type="range" min="1" max="10" value={speed} onChange={e=>setSpeed(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />
            </>
          )}
        </div>

        <div className="w-full lg:w-2/3">
          <div className="flex space-x-2 mb-4 border-b">
            <button onClick={() => { setTab('static'); setIsPlaying(false); }} className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${tab==='static' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Quỹ đạo Tĩnh</button>
            <button onClick={() => setTab('anim')} className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${tab==='anim' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Mô phỏng Động</button>
          </div>
          
          {tab === 'anim' && (
            <div className="flex gap-2 mb-2">
              <button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center px-4 py-2 bg-[#FF6B6B] text-white rounded hover:bg-red-500 transition-colors">
                {isPlaying ? <Pause size={18} className="mr-1"/> : <Play size={18} className="mr-1"/>} {isPlaying ? "Tạm dừng" : "Phát"}
              </button>
              <button onClick={() => setFrame(0)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">Làm lại</button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden">
            {renderPlot()}
          </div>
        </div>
      </div>
    </div>
  );
};

const Page1 = () => {
  const [dim, setDim] = useState("2 Chiều (2D)");
  const [N, setN] = useState(3);
  const [steps, setSteps] = useState(300);
  const [D, setD] = useState(1.0);
  const dt = 0.1;

  const data = useMemo(() => {
    if (dim === "2 Chiều (2D)") return run_simulation_2d(N, steps, D, 0, 0, dt);
    return run_simulation_3d(N, steps, D, 0, 0, 0, dt);
  }, [dim, N, steps, D]);

  const renderPlot = () => {
    const d = data as any;
    if (dim === "2 Chiều (2D)") {
      const traces: any[] = d.x.map((traj: any, i: number) => ({
        x: traj, y: d.y[i], mode: 'lines', line: { width: 1.5 }, opacity: 0.7, showlegend: false
      }));
      traces.push({ x: [0], y: [0], mode: 'markers', marker: { color: 'red', size: 12, symbol: 'star' }, name: 'Nguồn' });
      return <Plot data={traces} layout={{ title: "Quỹ đạo các hạt (2D)", xaxis: { title: "Trục X", range: [-30, 30], zeroline: false }, yaxis: { title: "Trục Y", range: [-30, 30], zeroline: false }, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    } else {
      const traces: any[] = d.x.map((traj: any, i: number) => ({
        x: traj, y: d.y[i], z: d.z[i], type: 'scatter3d', mode: 'lines', line: { width: 2 }, opacity: 0.6, showlegend: false
      }));
      traces.push({ x: [0], y: [0], z: [0], type: 'scatter3d', mode: 'markers', marker: { color: 'red', size: 8, symbol: 'diamond' }, name: 'Nguồn' });
      return <Plot data={traces} layout={{ title: "Quỹ đạo Khuếch tán (3D)", scene: { xaxis: { range: [-30, 30], title: 'X' }, yaxis: { range: [-30, 30], title: 'Y' }, zaxis: { range: [-30, 30], title: 'Z' } }, template: 'plotly_dark', autosize: true, margin: {l:0, r:0, t:40, b:0} }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    }
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-bold mb-4 flex items-center text-gray-800"><Activity className="mr-2 text-[#4ECDC4]" /> Bài 1: Chuyển Động Brown</h2>
      <InfoBox>
        <b>Chuyển động Brown</b> là chuyển động zig-zag không ngừng của các hạt nhỏ bé. Phương trình Toán học Vi phân Ngẫu nhiên cơ bản:
      </InfoBox>
      <MathBox>X<sub>t+1</sub> = X<sub>t</sub> + √(2 · D · Δt) · ξ</MathBox>

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <div className="w-full lg:w-1/3 bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold mb-4 border-b pb-2 text-gray-700">⚙️ Thông số Mô phỏng</h3>
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Không gian</label>
          <select value={dim} onChange={e=>setDim(e.target.value)} className="w-full p-2 border rounded-md mb-4 bg-gray-50 focus:ring-[#4ECDC4] focus:border-[#4ECDC4]">
            <option>2 Chiều (2D)</option>
            <option>3 Chiều (3D - Mô hình mới)</option>
          </select>

          <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng hạt: {N}</label>
          <input type="range" min="1" max="20" value={N} onChange={e=>setN(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />

          <label className="block text-sm font-medium text-gray-700 mb-1">Số bước thời gian: {steps}</label>
          <input type="range" min="10" max="1000" value={steps} onChange={e=>setSteps(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />

          <label className="block text-sm font-medium text-gray-700 mb-1">Hệ số khuếch tán (D): {D.toFixed(1)}</label>
          <input type="range" min="0" max="5" step="0.1" value={D} onChange={e=>setD(parseFloat(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />
        </div>

        <div className="w-full lg:w-2/3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden">
            {renderPlot()}
          </div>
        </div>
      </div>
    </div>
  );
};

const Page2 = () => {
  const [N, setN] = useState(2000);
  const [steps, setSteps] = useState(300);
  const [D, setD] = useState(2.0);
  const [tab, setTab] = useState('3d');
  const dt = 0.1;

  const { x_final, y_final } = useMemo(() => {
    const data = run_simulation_2d(N, steps, D, 0, 0, dt);
    const xf = data.x.map(traj => traj[steps - 1]);
    const yf = data.y.map(traj => traj[steps - 1]);
    return { x_final: xf, y_final: yf };
  }, [N, steps, D]);

  const stats = useMemo(() => {
    let sumX = 0, sumY = 0;
    for(let i=0; i<N; i++) { sumX += x_final[i]; sumY += y_final[i]; }
    const meanX = sumX / N; const meanY = sumY / N;
    let varX = 0, varY = 0;
    for(let i=0; i<N; i++) { varX += Math.pow(x_final[i] - meanX, 2); varY += Math.pow(y_final[i] - meanY, 2); }
    return { meanX, meanY, varX: varX / N, varY: varY / N };
  }, [x_final, y_final, N]);

  const renderPlot = () => {
    if (tab === '3d') {
      const { z, x, y } = generate2DSurface(x_final, y_final, 30, [-30, 30]);
      return <Plot data={[{ z, x, y, type: 'surface', colorscale: 'Plasma' }]} layout={{ title: "Mặt cong Phân bố Mật độ (3D Surface)", template: 'plotly_dark', scene: { xaxis: { title: 'Trục X' }, yaxis: { title: 'Trục Y' }, zaxis: { title: 'Mật độ' } }, autosize: true, margin: {l:0, r:0, t:40, b:0} }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    } else if (tab === '2d') {
      return <Plot data={[{ x: x_final, y: y_final, type: 'histogram2dcontour', colorscale: 'Viridis', contours: { coloring: 'fill', showlabels: true } }, { x: [0], y: [0], mode: 'markers', marker: { color: 'white', size: 10, symbol: 'x' }, name: 'Nguồn' }]} layout={{ title: "Bản đồ Phân bố Mật độ (2D)", template: 'plotly_dark', xaxis: { range: [-30, 30] }, yaxis: { range: [-30, 30] }, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    } else {
      return <Plot data={[{ x: x_final, type: 'histogram', nbinsx: 50, marker: { color: '#4ECDC4' }, opacity: 0.8 }]} layout={{ title: "Phân bố Histogram (Trục X)", xaxis: { title: 'Vị trí X' }, yaxis: { title: 'Số lượng hạt' }, bargap: 0.05, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    }
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-bold mb-4 flex items-center text-gray-800"><Layers className="mr-2 text-[#4ECDC4]" /> Bài 2: Hình Thành Quy Luật Phân Bố</h2>
      <InfoBox>
        Sự chuyển tiếp từ cái "Vi mô" (hạt ngẫu nhiên) lên cái "Vĩ mô" (đám mây nồng độ dự đoán được). Mật độ tuân theo Phương trình Đạo hàm riêng:
      </InfoBox>
      <MathBox>∂p / ∂t = D · (∂²p / ∂x²)</MathBox>

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <div className="w-full lg:w-1/3 bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold mb-4 border-b pb-2 text-gray-700">⚙️ Thông số Mô phỏng</h3>
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng hạt: {N}</label>
          <input type="range" min="100" max="5000" step="100" value={N} onChange={e=>setN(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />

          <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (t): {steps}</label>
          <input type="range" min="50" max="1000" value={steps} onChange={e=>setSteps(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />

          <label className="block text-sm font-medium text-gray-700 mb-1">Hệ số khuếch tán (D): {D.toFixed(1)}</label>
          <input type="range" min="0.1" max="10.0" step="0.1" value={D} onChange={e=>setD(parseFloat(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />
        </div>

        <div className="w-full lg:w-2/3">
          <div className="flex space-x-2 mb-4 border-b overflow-x-auto">
            <button onClick={() => setTab('3d')} className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap transition-colors ${tab==='3d' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600'}`}>Mặt cong (3D)</button>
            <button onClick={() => setTab('2d')} className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap transition-colors ${tab==='2d' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600'}`}>Bản đồ (2D)</button>
            <button onClick={() => setTab('hist')} className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap transition-colors ${tab==='hist' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600'}`}>Histogram</button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden mb-6">
            {renderPlot()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Metric label="Kỳ vọng (Tâm)" value={`X: ${stats.meanX.toFixed(2)}`} subtext="Lý thuyết: ~ 0.00" />
            <Metric label="Phương sai X" value={stats.varX.toFixed(2)} subtext={`Lý thuyết: ${(2 * D * steps * dt).toFixed(2)}`} />
            <Metric label="Phương sai Y" value={stats.varY.toFixed(2)} subtext={`Lý thuyết: ${(2 * D * steps * dt).toFixed(2)}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Page3 = () => {
  const [N, setN] = useState(800);
  const [steps, setSteps] = useState(200);
  const [D, setD] = useState(1.0);
  const [vx, setVx] = useState(2.0);
  const [vy, setVy] = useState(1.0);
  const [tab, setTab] = useState('heatmap');
  const dt = 0.1;

  const data = useMemo(() => run_simulation_2d(N, steps, D, vx, vy, dt), [N, steps, D, vx, vy]);
  const x_final = data.x.map(traj => traj[steps - 1]);
  const y_final = data.y.map(traj => traj[steps - 1]);

  const stats = useMemo(() => {
    let sumX = 0, sumY = 0;
    for(let i=0; i<N; i++) { sumX += x_final[i]; sumY += y_final[i]; }
    return { meanX: sumX / N, meanY: sumY / N };
  }, [x_final, y_final, N]);

  const renderPlot = () => {
    if (tab === 'heatmap') {
      return <Plot data={[{ x: x_final, y: y_final, type: 'histogram2dcontour', colorscale: 'Viridis' }, { x: [0], y: [0], mode: 'markers', marker: { color: 'white', size: 10, symbol: 'x' }, name: 'Nguồn' }]} layout={{ title: "Đám mây ô nhiễm bị gió thổi dạt", template: 'plotly_dark', xaxis: { title: 'X', range: [-10, Math.max(30, vx*steps*dt+10)] }, yaxis: { title: 'Y', range: [-10, Math.max(30, vy*steps*dt+10)] }, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    } else {
      const d = data as any;
      const traces: any[] = d.x.slice(0, 100).map((traj: any, i: number) => ({
        x: traj, y: d.y[i], mode: 'lines', line: { width: 1.5 }, opacity: 0.7, showlegend: false
      }));
      traces.push({ x: [0], y: [0], mode: 'markers', marker: { color: 'red', size: 12, symbol: 'star' }, name: 'Nguồn' });
      return <Plot data={traces} layout={{ title: "Quỹ đạo các hạt bị cuốn", xaxis: { title: "X" }, yaxis: { title: "Y" }, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    }
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-bold mb-4 flex items-center text-gray-800"><Wind className="mr-2 text-[#4ECDC4]" /> Bài 3: Đối Lưu & Môi Trường</h2>
      <InfoBox>
        Hiện tượng bị cuốn đi có hướng bởi gió hoặc nước gọi là <b>Đối lưu (Advection / Drift)</b>.
      </InfoBox>
      <MathBox>X<sub>t+1</sub> = X<sub>t</sub> + v<sub>x</sub> · Δt + √(2D · Δt) · ξ</MathBox>

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <div className="w-full lg:w-1/3 bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold mb-4 border-b pb-2 text-gray-700">⚙️ Điều chỉnh Môi trường</h3>
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng hạt: {N}</label>
          <input type="range" min="100" max="2000" value={N} onChange={e=>setN(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (t): {steps}</label>
          <input type="range" min="50" max="500" value={steps} onChange={e=>setSteps(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Độ hỗn loạn (D): {D.toFixed(1)}</label>
          <input type="range" min="0.1" max="5.0" step="0.1" value={D} onChange={e=>setD(parseFloat(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />

          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-700 mb-2 flex items-center"><Wind size={16} className="mr-1"/> Vận tốc Dòng chảy</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gió X (vx): {vx.toFixed(1)}</label>
            <input type="range" min="-5" max="5" step="0.1" value={vx} onChange={e=>setVx(parseFloat(e.target.value))} className="w-full mb-4 accent-blue-500" />
            <label className="block text-sm font-medium text-gray-700 mb-1">Gió Y (vy): {vy.toFixed(1)}</label>
            <input type="range" min="-5" max="5" step="0.1" value={vy} onChange={e=>setVy(parseFloat(e.target.value))} className="w-full accent-blue-500" />
          </div>
        </div>

        <div className="w-full lg:w-2/3">
          <div className="flex space-x-2 mb-4 border-b">
            <button onClick={() => setTab('heatmap')} className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${tab==='heatmap' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600'}`}>Bản đồ Vĩ mô</button>
            <button onClick={() => setTab('scatter')} className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${tab==='scatter' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600'}`}>Quỹ đạo Vi mô</button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden mb-4">
            {renderPlot()}
          </div>
          <div className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-lg">
            📌 <b>Kết quả:</b> Sau {steps} bước, tâm đám mây dự kiến ở vị trí <b>X = {(vx * steps * dt).toFixed(1)}, Y = {(vy * steps * dt).toFixed(1)}</b>.<br/>
            Thực tế mô phỏng: <b>X ≈ {stats.meanX.toFixed(1)}, Y ≈ {stats.meanY.toFixed(1)}</b>.
          </div>
        </div>
      </div>
    </div>
  );
};

const Page4 = () => {
  const N = 2500;
  const dt = 0.1;
  const [steps, setSteps] = useState(200);
  const [D, setD] = useState(2.0);
  const [vx, setVx] = useState(1.5);
  const [vy, setVy] = useState(0.5);
  const [target_x, setTargetX] = useState(20.0);
  const [target_y, setTargetY] = useState(5.0);
  const [radius, setRadius] = useState(6);

  const { x_final, y_final, prob } = useMemo(() => {
    const data = run_simulation_2d(N, steps, D, vx, vy, dt);
    const xf = data.x.map(traj => traj[steps - 1]);
    const yf = data.y.map(traj => traj[steps - 1]);
    
    let count = 0;
    for (let i = 0; i < N; i++) {
      const dist = Math.sqrt(Math.pow(xf[i] - target_x, 2) + Math.pow(yf[i] - target_y, 2));
      if (dist <= radius) count++;
    }
    return { x_final: xf, y_final: yf, prob: (count / N) * 100 };
  }, [steps, D, vx, vy, target_x, target_y, radius]);

  const renderAlert = () => {
    if (prob > 50) return <div className="p-4 bg-red-100 text-red-800 border border-red-300 rounded-lg font-medium shadow-sm">🚨 MỨC ĐỘ NGUY HIỂM: RẤT CAO! Cần ra lệnh sơ tán lập tức.</div>;
    if (prob > 15) return <div className="p-4 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg font-medium shadow-sm">⚠️ MỨC ĐỘ NGUY HIỂM: TRUNG BÌNH. Cần chuẩn bị phương án dự phòng.</div>;
    if (prob > 0) return <div className="p-4 bg-blue-100 text-blue-800 border border-blue-300 rounded-lg font-medium shadow-sm">ℹ️ MỨC ĐỘ NGUY HIỂM: THẤP. Khu dân cư khá an toàn, chất ô nhiễm chỉ sượt qua.</div>;
    return <div className="p-4 bg-green-100 text-green-800 border border-green-300 rounded-lg font-medium shadow-sm">✅ AN TOÀN TUYỆT ĐỐI. Chất ô nhiễm không bay về hướng này.</div>;
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-bold mb-4 flex items-center text-gray-800"><AlertTriangle className="mr-2 text-[#4ECDC4]" /> Bài 4: Đánh Giá Rủi Ro (Monte Carlo)</h2>
      <InfoBox>
        Sử dụng mô phỏng <b>Monte Carlo</b> để tính Xác suất xảy ra rủi ro dựa trên hàng ngàn kịch bản phát tán dưới điều kiện bất định.
      </InfoBox>

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <div className="w-full lg:w-1/3 bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold mb-4 border-b pb-2 text-gray-700">⚙️ Kịch bản Rủi ro</h3>
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian phát tán: {steps}</label>
          <input type="range" min="50" max="400" value={steps} onChange={e=>setSteps(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Độ hỗn loạn (D): {D.toFixed(1)}</label>
          <input type="range" min="0.5" max="5.0" step="0.1" value={D} onChange={e=>setD(parseFloat(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />
          
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
            <h4 className="font-bold text-gray-700 mb-2">🌬️ Dự báo dòng chảy</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vận tốc X: {vx.toFixed(1)}</label>
            <input type="range" min="-3" max="3" step="0.1" value={vx} onChange={e=>setVx(parseFloat(e.target.value))} className="w-full mb-2 accent-blue-500" />
            <label className="block text-sm font-medium text-gray-700 mb-1">Vận tốc Y: {vy.toFixed(1)}</label>
            <input type="range" min="-3" max="3" step="0.1" value={vy} onChange={e=>setVy(parseFloat(e.target.value))} className="w-full accent-blue-500" />
          </div>

          <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
            <h4 className="font-bold text-gray-700 mb-2">🎯 Khu Vực Dân Cư</h4>
            <div className="flex gap-2 mb-2">
              <div className="w-1/2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Tọa độ X</label>
                <input type="number" value={target_x} onChange={e=>setTargetX(parseFloat(e.target.value))} className="w-full p-1 border rounded" />
              </div>
              <div className="w-1/2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Tọa độ Y</label>
                <input type="number" value={target_y} onChange={e=>setTargetY(parseFloat(e.target.value))} className="w-full p-1 border rounded" />
              </div>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bán kính: {radius}</label>
            <input type="range" min="2" max="15" value={radius} onChange={e=>setRadius(parseInt(e.target.value))} className="w-full accent-red-500" />
          </div>
        </div>

        <div className="w-full lg:w-2/3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden mb-6">
            <Plot 
              data={[
                { x: x_final, y: y_final, type: 'histogram2dcontour', colorscale: 'Viridis' },
                { x: [0], y: [0], mode: 'markers', marker: { color: 'white', size: 10, symbol: 'x' }, name: 'Nguồn' },
                { x: [target_x], y: [target_y+radius+2], mode: 'text', text: ['🏠 Khu Dân Cư'], textfont: {color: 'white', size: 14} }
              ]} 
              layout={{ 
                title: "Bản Đồ Cảnh Báo Nguy Cơ", 
                template: 'plotly_dark',
                xaxis: { range: [-10, 40] }, yaxis: { range: [-10, 30] },
                shapes: [{
                  type: 'circle',
                  x0: target_x - radius, y0: target_y - radius,
                  x1: target_x + radius, y1: target_y + radius,
                  line: { color: 'orange', width: 3 },
                  fillcolor: 'yellow', opacity: 0.4
                }],
                autosize: true
              }} 
              useResizeHandler 
              className="w-full h-[500px]" 
              config={{responsive: true}} 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Metric label="⚠️ Xác suất ô nhiễm ảnh hưởng" value={`${prob.toFixed(2)}%`} />
            <div className="flex items-center h-full">
              {renderAlert()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Page5 = () => {
  const [N, setN] = useState(200);
  const [steps, setSteps] = useState(300);
  const [D, setD] = useState(1.0);
  const [vx, setVx] = useState(0.0);
  const [vy, setVy] = useState(0.0);
  const [step_interval, setStepInterval] = useState(3);
  const [tab, setTab] = useState('scatter');
  const dt = 0.1;

  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);

  const data = useMemo(() => run_simulation_2d(N, steps, D, vx, vy, dt), [N, steps, D, vx, vy]);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setFrame(f => (f + step_interval >= steps ? 0 : f + step_interval));
      }, 100); // 100ms per frame update in react
    }
    return () => clearInterval(interval);
  }, [isPlaying, step_interval, steps]);

  // Reset frame when parameters change
  useEffect(() => {
    setFrame(0);
    setIsPlaying(false);
  }, [data, tab]);

  const renderPlot = () => {
    const currentX = data.x.map(traj => traj[frame]);
    const currentY = data.y.map(traj => traj[frame]);
    const max_x = Math.max(...data.x.map(t=>Math.max(...t))) + 5;
    const min_x = Math.min(...data.x.map(t=>Math.min(...t))) - 5;
    const max_y = Math.max(...data.y.map(t=>Math.max(...t))) + 5;
    const min_y = Math.min(...data.y.map(t=>Math.min(...t))) - 5;

    if (tab === 'scatter') {
      return <Plot data={[{ x: currentX, y: currentY, mode: 'markers', marker: { size: 6, color: '#4ECDC4', opacity: 0.7 } }, { x: [0], y: [0], mode: 'markers', marker: { color: 'white', size: 12, symbol: 'star' } }]} layout={{ title: `Thời gian: Bước ${frame}`, template: 'plotly_dark', xaxis: { range: [min_x, max_x], title: 'Trục X' }, yaxis: { range: [min_y, max_y], title: 'Trục Y' }, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    } else if (tab === 'heatmap') {
      return <Plot data={[{ x: currentX, y: currentY, type: 'histogram2dcontour', colorscale: 'Viridis', contours: { coloring: 'fill', showlabels: false }, xbins: {start: min_x, end: max_x, size: (max_x-min_x)/20}, ybins: {start: min_y, end: max_y, size: (max_y-min_y)/20} }]} layout={{ title: `Bản đồ Mật độ: Bước ${frame}`, template: 'plotly_dark', xaxis: { range: [min_x, max_x] }, yaxis: { range: [min_y, max_y] }, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    } else {
      return <Plot data={[{ x: currentX, type: 'histogram', nbinsx: 30, marker: { color: '#FF6B6B' }, opacity: 0.8 }]} layout={{ title: `Phân bố Histogram X: Bước ${frame}`, xaxis: { range: [min_x, max_x], title: 'Vị trí X' }, yaxis: { range: [0, N/2], title: 'Số lượng hạt' }, autosize: true }} useResizeHandler className="w-full h-[500px]" config={{responsive: true}} />;
    }
  };

  return (
    <div className="animate-fadeIn">
      <h2 className="text-3xl font-bold mb-4 flex items-center text-gray-800"><Video className="mr-2 text-[#4ECDC4]" /> Bài 5: Mô Phỏng Động (Animation)</h2>
      <InfoBox>
        Trực quan hóa sự khuếch tán theo thời gian thực. Bấm <b>Phát (Play)</b> để xem các hạt lan tỏa và bị thổi đi.
      </InfoBox>

      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <div className="w-full lg:w-1/3 bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold mb-4 border-b pb-2 text-gray-700">⚙️ Thông số Mô phỏng</h3>
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Số hạt hiển thị: {N}</label>
          <input type="range" min="50" max="500" step="50" value={N} onChange={e=>setN(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Số bước thời gian: {steps}</label>
          <input type="range" min="100" max="1000" step="100" value={steps} onChange={e=>setSteps(parseInt(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />
          
          <label className="block text-sm font-medium text-gray-700 mb-1">Hệ số khuếch tán (D): {D.toFixed(1)}</label>
          <input type="range" min="0.1" max="5.0" step="0.1" value={D} onChange={e=>setD(parseFloat(e.target.value))} className="w-full mb-4 accent-[#4ECDC4]" />

          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-bold text-gray-700 mb-2">🌬️ Dòng chảy</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gió X (vx): {vx.toFixed(1)}</label>
            <input type="range" min="-5" max="5" step="0.5" value={vx} onChange={e=>setVx(parseFloat(e.target.value))} className="w-full mb-2 accent-blue-500" />
            <label className="block text-sm font-medium text-gray-700 mb-1">Gió Y (vy): {vy.toFixed(1)}</label>
            <input type="range" min="-5" max="5" step="0.5" value={vy} onChange={e=>setVy(parseFloat(e.target.value))} className="w-full accent-blue-500" />
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1">Tốc độ Animation: {step_interval}</label>
          <input type="range" min="1" max="20" value={step_interval} onChange={e=>setStepInterval(parseInt(e.target.value))} className="w-full mb-2 accent-[#4ECDC4]" />
        </div>

        <div className="w-full lg:w-2/3">
          <div className="flex flex-wrap space-x-2 mb-4 border-b">
            <button onClick={() => setTab('scatter')} className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${tab==='scatter' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600'}`}>Quỹ đạo hạt</button>
            <button onClick={() => setTab('heatmap')} className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${tab==='heatmap' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600'}`}>Bản đồ Mật độ</button>
            <button onClick={() => setTab('hist')} className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${tab==='hist' ? 'bg-[#4ECDC4] text-white' : 'bg-gray-100 text-gray-600'}`}>Phân bố</button>
          </div>
          
          <div className="flex gap-2 mb-2 items-center">
            <button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center px-6 py-2 bg-[#FF6B6B] text-white rounded-lg hover:bg-red-500 transition-colors shadow font-medium">
              {isPlaying ? <Pause size={18} className="mr-2"/> : <Play size={18} className="mr-2"/>} {isPlaying ? "Tạm dừng" : "Phát (Play)"}
            </button>
            <span className="text-gray-500 font-medium ml-4">Tiến trình: {Math.round((frame/steps)*100)}%</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2.5 ml-2">
              <div className="bg-[#4ECDC4] h-2.5 rounded-full" style={{ width: `${(frame/steps)*100}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden">
            {renderPlot()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const pages = [
    { title: "0. Bước Đi Ngẫu Nhiên Rời Rạc", component: Page0, icon: <Activity size={18} /> },
    { title: "1. Khám phá Quỹ đạo (Vi mô)", component: Page1, icon: <BookOpen size={18} /> },
    { title: "2. Từ Hạt đến Phân bố (Vĩ mô)", component: Page2, icon: <Layers size={18} /> },
    { title: "3. Tác động Đối lưu & Môi trường", component: Page3, icon: <Wind size={18} /> },
    { title: "4. Bản đồ Nguy cơ & Bất định", component: Page4, icon: <AlertTriangle size={18} /> },
    { title: "5. Mô phỏng động (Animation)", component: Page5, icon: <Video size={18} /> },
  ];

  const PageComponent = pages[currentPage].component;

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex text-gray-900 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md text-gray-700">
          <Menu size={24} />
        </button>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-40 w-72 bg-white border-r border-gray-200 shadow-sm flex flex-col`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="font-black text-2xl bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">STEM Lab</div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-800"><X size={20} /></button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">📚 Lộ trình học tập</h3>
          <ul className="space-y-1">
            {pages.map((page, index) => (
              <li key={index}>
                <button
                  onClick={() => { setCurrentPage(index); if (window.innerWidth < 768) setSidebarOpen(false); }}
                  className={`w-full flex items-center p-3 rounded-lg text-left transition-colors font-medium text-sm ${currentPage === index ? 'bg-[#eef2f5] text-[#4ECDC4] border-l-4 border-[#4ECDC4]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'}`}
                >
                  <span className="mr-3">{page.icon}</span>
                  {page.title}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg text-xs text-blue-800 border border-blue-100">
            <Info size={16} className="inline mr-1 mb-1" />
            <b>Ghi chú:</b> Ứng dụng STEM dựa trên mô phỏng số phương trình ngẫu nhiên, giúp học sinh làm quen với toán học qua trực quan.
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 py-4 px-8 sticky top-0 z-30">
          <h1 className="text-3xl md:text-4xl font-extrabold text-center bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">
            🧪 STEM: Khám Phá Thế Giới Khuếch Tán
          </h1>
          <p className="text-center text-gray-500 text-sm md:text-base mt-2 font-medium">
            Từ Bước Đi Ngẫu Nhiên (Random Walk) Đến Phương Trình Đạo Hàm Riêng Ngẫu Nhiên (SPDE)
          </p>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <PageComponent />
          </div>
        </main>
      </div>

      {/* Basic global styles injected via standard way to ensure beautiful rendering */}
      <style dangerouslySetInnerHTML={{__html: `
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}