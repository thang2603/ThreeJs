import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface InstancesData {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  selected: Uint8Array;
}

interface DraggableInstancesProps {
  data: InstancesData;
  onUpdateData: (data: InstancesData) => void;
}

function DraggableInstances({ data, onUpdateData }: DraggableInstancesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera, raycaster, pointer } = useThree();
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const intersectionPoint = useRef(new THREE.Vector3());
  const dragStartPos = useRef<[number, number, number]>([0, 0, 0]);

  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const yellowColor = useMemo(() => new THREE.Color(1, 1, 0), []);

  useFrame(() => {
    if (!meshRef.current || data.count === 0) return;
    
    for (let i = 0; i < data.count; i++) {
      const i3 = i * 3;
      
      tempObject.position.set(
        data.positions[i3],
        data.positions[i3 + 1],
        data.positions[i3 + 2]
      );
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
      
      if (data.selected[i]) {
        meshRef.current.setColorAt(i, yellowColor);
      } else {
        tempColor.setRGB(
          data.colors[i3],
          data.colors[i3 + 1],
          data.colors[i3 + 2]
        );
        meshRef.current.setColorAt(i, tempColor);
      }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    
    if (e.instanceId !== undefined && e.instanceId < data.count) {
      const newSelected = new Uint8Array(data.selected);
      
      if (e.shiftKey) {
        newSelected[e.instanceId] = newSelected[e.instanceId] ? 0 : 1;
      } else {
        const wasSelected = newSelected[e.instanceId];
        if (!wasSelected) {
          newSelected.fill(0);
          newSelected[e.instanceId] = 1;
        }
      }
      
      const newData = { ...data, selected: newSelected };
      onUpdateData(newData);
      
      let selectedCount = 0;
      for (let i = 0; i < newSelected.length; i++) {
        if (newSelected[i]) selectedCount++;
      }
      
      if (selectedCount > 0) {
        setIsDragging(true);
        setDraggedIndex(e.instanceId);
        
        const i3 = e.instanceId * 3;
        dragStartPos.current = [
          data.positions[i3],
          data.positions[i3 + 1],
          data.positions[i3 + 2]
        ];
        
        const normal = new THREE.Vector3(0, 0, 1);
        normal.applyQuaternion(camera.quaternion);
        planeRef.current.setFromNormalAndCoplanarPoint(
          normal,
          new THREE.Vector3(...dragStartPos.current)
        );
      }
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || draggedIndex === null) return;
    
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(planeRef.current, intersectionPoint.current);
    
    if (intersectionPoint.current) {
      const deltaX = intersectionPoint.current.x - dragStartPos.current[0];
      const deltaY = intersectionPoint.current.y - dragStartPos.current[1];
      const deltaZ = intersectionPoint.current.z - dragStartPos.current[2];
      
      const newPositions = new Float32Array(data.positions);
      
      for (let i = 0; i < data.count; i++) {
        if (data.selected[i]) {
          const i3 = i * 3;
          newPositions[i3] = data.positions[i3] + deltaX;
          newPositions[i3 + 1] = data.positions[i3 + 1] + deltaY;
          newPositions[i3 + 2] = data.positions[i3 + 2] + deltaZ;
        }
      }
      
      dragStartPos.current = [
        intersectionPoint.current.x,
        intersectionPoint.current.y,
        intersectionPoint.current.z
      ];
      
      onUpdateData({ ...data, positions: newPositions });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDraggedIndex(null);
  };

  if (data.count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, data.count]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      frustumCulled={false}
    >
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

function createInitialData(count: number): InstancesData {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const selected = new Uint8Array(count);
  
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    positions[i3] = (Math.random() - 0.5) * 20;
    positions[i3 + 1] = (Math.random() - 0.5) * 20;
    positions[i3 + 2] = (Math.random() - 0.5) * 20;
    
    const hue = Math.random();
    const saturation = 0.7;
    const lightness = 0.5;
    const color = new THREE.Color().setHSL(hue, saturation, lightness);
    
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }
  
  return { count, positions, colors, selected };
}

export default function App() {
  const [data, setData] = useState<InstancesData>(() => createInitialData(100000));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPosition, setEditPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [editColor, setEditColor] = useState<string>('#ff0000');

  const selectedCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < data.selected.length; i++) {
      if (data.selected[i]) count++;
    }
    return count;
  }, [data.selected]);

  const getFirstSelectedIndex = (): number | null => {
    for (let i = 0; i < data.selected.length; i++) {
      if (data.selected[i]) return i;
    }
    return null;
  };

  const handleAddInstances = (count: number) => {
    const newCount = data.count + count;
    const newPositions = new Float32Array(newCount * 3);
    const newColors = new Float32Array(newCount * 3);
    const newSelected = new Uint8Array(newCount);
    
    newPositions.set(data.positions);
    newColors.set(data.colors);
    newSelected.set(data.selected);
    
    for (let i = data.count; i < newCount; i++) {
      const i3 = i * 3;
      
      newPositions[i3] = (Math.random() - 0.5) * 20;
      newPositions[i3 + 1] = (Math.random() - 0.5) * 20;
      newPositions[i3 + 2] = (Math.random() - 0.5) * 20;
      
      const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
      newColors[i3] = color.r;
      newColors[i3 + 1] = color.g;
      newColors[i3 + 2] = color.b;
    }
    
    setData({ count: newCount, positions: newPositions, colors: newColors, selected: newSelected });
  };

  const handleDeleteSelected = () => {
    const newCount = data.count - selectedCount;
    const newPositions = new Float32Array(newCount * 3);
    const newColors = new Float32Array(newCount * 3);
    const newSelected = new Uint8Array(newCount);
    
    let newIndex = 0;
    for (let i = 0; i < data.count; i++) {
      if (!data.selected[i]) {
        const i3 = i * 3;
        const newI3 = newIndex * 3;
        
        newPositions[newI3] = data.positions[i3];
        newPositions[newI3 + 1] = data.positions[i3 + 1];
        newPositions[newI3 + 2] = data.positions[i3 + 2];
        
        newColors[newI3] = data.colors[i3];
        newColors[newI3 + 1] = data.colors[i3 + 1];
        newColors[newI3 + 2] = data.colors[i3 + 2];
        
        newIndex++;
      }
    }
    
    setData({ count: newCount, positions: newPositions, colors: newColors, selected: newSelected });
    setEditingIndex(null);
  };

  const handleDeselectAll = () => {
    const newSelected = new Uint8Array(data.count);
    setData({ ...data, selected: newSelected });
    setEditingIndex(null);
  };

  const handleEditSelected = () => {
    const firstSelected = getFirstSelectedIndex();
    if (firstSelected !== null && selectedCount === 1) {
      const i3 = firstSelected * 3;
      setEditingIndex(firstSelected);
      setEditPosition([
        data.positions[i3],
        data.positions[i3 + 1],
        data.positions[i3 + 2]
      ]);
      
      const color = new THREE.Color(
        data.colors[i3],
        data.colors[i3 + 1],
        data.colors[i3 + 2]
      );
      setEditColor('#' + color.getHexString());
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const newPositions = new Float32Array(data.positions);
      const newColors = new Float32Array(data.colors);
      
      const i3 = editingIndex * 3;
      newPositions[i3] = editPosition[0];
      newPositions[i3 + 1] = editPosition[1];
      newPositions[i3 + 2] = editPosition[2];
      
      const color = new THREE.Color(editColor);
      newColors[i3] = color.r;
      newColors[i3 + 1] = color.g;
      newColors[i3 + 2] = color.b;
      
      setData({ ...data, positions: newPositions, colors: newColors });
      setEditingIndex(null);
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    margin: '4px',
    background: '#4a5568',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'monospace'
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#2d3748',
    cursor: 'not-allowed',
    opacity: 0.5
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <DraggableInstances data={data} onUpdateData={setData} />
        
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <gridHelper args={[30, 30]} />
      </Canvas>
      
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.85)',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '13px',
        minWidth: '280px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ marginBottom: '12px' }}>
          <strong style={{ fontSize: '16px' }}>🎮 Controls</strong>
          <div style={{ fontSize: '12px', marginTop: '5px', color: '#cbd5e0' }}>
            <div>• Click: chọn instance</div>
            <div>• Shift+Click: chọn nhiều</div>
            <div>• Drag: di chuyển đã chọn</div>
            <div>• Right-Click: xoay camera</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #4a5568', paddingTop: '10px' }}>
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ fontSize: '15px' }}>📊 Instances: {data.count.toLocaleString()}</strong>
            {selectedCount > 0 && (
              <span style={{ color: '#fbbf24' }}> ({selectedCount} selected)</span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
            <button style={buttonStyle} onClick={() => handleAddInstances(1)}>
              ➕ +1
            </button>
            <button style={buttonStyle} onClick={() => handleAddInstances(100)}>
              ➕ +100
            </button>
            <button style={buttonStyle} onClick={() => handleAddInstances(1000)}>
              ➕ +1K
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <button 
              style={selectedCount > 0 ? buttonStyle : disabledButtonStyle}
              onClick={handleDeleteSelected}
              disabled={selectedCount === 0}
            >
              🗑️ Xóa ({selectedCount})
            </button>
            <button 
              style={selectedCount === 1 ? buttonStyle : disabledButtonStyle}
              onClick={handleEditSelected}
              disabled={selectedCount !== 1}
            >
              ✏️ Sửa
            </button>
            <button 
              style={selectedCount > 0 ? buttonStyle : disabledButtonStyle}
              onClick={handleDeselectAll}
              disabled={selectedCount === 0}
            >
              ❌ Bỏ chọn
            </button>
          </div>
        </div>

        {editingIndex !== null && (
          <div style={{
            borderTop: '1px solid #4a5568',
            paddingTop: '10px',
            marginTop: '10px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>✏️ Sửa Instance #{editingIndex}</strong>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>X:</label>
              <input
                type="number"
                step="0.1"
                value={editPosition[0].toFixed(2)}
                onChange={(e) => setEditPosition([parseFloat(e.target.value), editPosition[1], editPosition[2]])}
                style={{ width: '100%', padding: '6px', background: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Y:</label>
              <input
                type="number"
                step="0.1"
                value={editPosition[1].toFixed(2)}
                onChange={(e) => setEditPosition([editPosition[0], parseFloat(e.target.value), editPosition[2]])}
                style={{ width: '100%', padding: '6px', background: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Z:</label>
              <input
                type="number"
                step="0.1"
                value={editPosition[2].toFixed(2)}
                onChange={(e) => setEditPosition([editPosition[0], editPosition[1], parseFloat(e.target.value)])}
                style={{ width: '100%', padding: '6px', background: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Color:</label>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                style={{ width: '100%', height: '32px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button style={{ ...buttonStyle, flex: 1, background: '#10b981' }} onClick={handleSaveEdit}>
                💾 Lưu
              </button>
              <button style={{ ...buttonStyle, flex: 1, background: '#ef4444' }} onClick={() => setEditingIndex(null)}>
                ✖️ Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
