import { Chapter } from "@/types/page";

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "Robot Basics",
    path: "/robot-basics",
    description: "Learn the fundamental components of a robotic arm",
  },
  {
    id: 2,
    title: "Position",
    path: "/position",
    description: "Understand position representation in 2D and 3D space",
  },
  {
    id: 3,
    title: "Orientation",
    path: "/orientation",
    description: "Learn rotation matrices and orientation representation",
  },
  {
    id: 4,
    title: "Transformation",
    path: "/transformation",
    description: "Master homogeneous transformation matrices",
  },
  {
    id: 5,
    title: "Forward Kinematics",
    path: "/forward-kinematics",
    description: "Compute end-effector position from joint angles",
  },
  {
    id: 6,
    title: "Inverse Kinematics",
    path: "/inverse-kinematics",
    description: "Find joint angles to reach a target position",
  },
  {
    id: 7,
    title: "Advanced Topics",
    path: "/advanced",
    description: "Explore advanced kinematics concepts",
  },
];
