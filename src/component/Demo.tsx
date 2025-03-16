import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useDrag } from "@use-gesture/react";
import { Instance, Instances } from "@react-three/drei";
import { InstancedMesh, Vector3 } from "three";

// Kiểu dữ liệu cho vị trí của một item
type Position = [number, number, number];

// Props cho component DraggableInstance
interface DraggableInstanceProps {
  index: number;
  position: Position;
  onDrag: (index: number, newPosition: Position) => void;
}

// Component cho một item có thể kéo thả
function DraggableInstance({
  index,
  position,
  onDrag,
}: DraggableInstanceProps) {
  const meshRef = useRef<InstancedMesh>(null!);
  const [isDragging, setIsDragging] = useState(false);

  // Sử dụng useDrag để xử lý sự kiện kéo thả
  const bind = useDrag(({ active, movement: [mx, my] }) => {
    setIsDragging(active);
    if (active) {
      // Tính toán vị trí mới dựa trên sự kiện kéo
      const newPosition: Position = [
        position[0] + mx / 100,
        position[1] - my / 100,
        position[2],
      ];
      onDrag(index, newPosition); // Gọi callback để cập nhật vị trí
    }
  });

  // Cập nhật vị trí của item trong mỗi frame
  useFrame(() => {
    if (isDragging && meshRef.current) {
      // Di chuyển mượt mà đến vị trí mới
      meshRef.current.position.lerp(new Vector3(...position), 0.1);
    }
  });

  return (
    <Instance
      ref={meshRef}
      position={position}
      {...bind()} // Gắn sự kiện kéo thả
    />
  );
}

// Component chính
export default function App() {
  // State lưu trữ vị trí của 100 item
  const [positions, setPositions] = useState<Position[]>(() =>
    Array.from({ length: 100 }, () => [
      Math.random() * 10 - 5, // Random position x
      Math.random() * 10 - 5, // Random position y
      0, // Z position
    ])
  );

  // Hàm xử lý khi một item được kéo thả
  const handleDrag = (index: number, newPosition: Position) => {
    const newPositions = [...positions];
    newPositions[index] = newPosition;
    setPositions(newPositions);
  };

  return (
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Instances>
        <boxGeometry args={[0.5, 0.5, 0.5]} /> {/* Kích thước của mỗi item */}
        <meshStandardMaterial color="orange" />
        {positions.map((pos, index) => (
          <DraggableInstance
            key={index}
            index={index}
            position={pos}
            onDrag={handleDrag}
          />
        ))}
      </Instances>
    </Canvas>
  );
}
