import { useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useDrag } from "@use-gesture/react";
import {
  CameraControls,
  Grid,
  Instance,
  Instances,
  Sky,
  Stats,
} from "@react-three/drei";
import { Vector3, Plane } from "three";
import * as THREE from "three";
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
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const { camera, size } = useThree(); // Lấy thông tin camera và kích thước màn hình
  const [isDragging, setIsDragging] = useState(false);
  const plane = new Plane(new Vector3(0, 0, 1), 0); // Mặt phẳng để giao với raycaster

  // Sử dụng useDrag để xử lý sự kiện kéo thả
  const bind = useDrag(({ active, event }) => {
    setIsDragging(active);
    if (active && event) {
      // Lấy tọa độ chuột trong không gian 2D
      const { offsetX, offsetY } = event as PointerEvent;

      // Chuyển đổi tọa độ chuột sang không gian 3D
      const x = (offsetX / size.width) * 2 - 1;
      const y = -(offsetY / size.height) * 2 + 1;

      // Tạo raycaster và tính toán giao điểm với mặt phẳng
      const raycaster = new THREE.Raycaster();
      const vector = new THREE.Vector2(x, y);
      raycaster.setFromCamera(vector, camera);
      const intersection = new Vector3();
      raycaster.ray.intersectPlane(plane, intersection);

      // Cập nhật vị trí mới
      onDrag(index, [intersection.x, intersection.y, 0]);
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
    Array.from({ length: 1000 }, () => [
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
    <Canvas
      style={{
        width: "100vw",
        height: "100vh",
      }}
    >
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Stats />
      <Sky />
      <Grid
        position={[0, -1, 0]} // Vị trí của lưới (đặt dưới sàn)
        args={[10, 10]} // Kích thước lưới [width, height]
        cellSize={1} // Kích thước mỗi ô lưới
        cellThickness={1} // Độ dày của đường kẻ ô lưới
        cellColor="#6f6f6f" // Màu của đường kẻ ô lưới
        sectionSize={5} // Kích thước mỗi section (phân vùng lớn hơn)
        sectionThickness={2} // Độ dày của đường kẻ section
        sectionColor="#9d4b4b" // Màu của đường kẻ section
        fadeDistance={30} // Khoảng cách bắt đầu mờ dần
        fadeStrength={1} // Độ mờ
        infiniteGrid // Lưới vô hạn
      />
      {/*    */}
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
