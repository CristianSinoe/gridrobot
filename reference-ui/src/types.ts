export interface Robot {
  id: string;
  name: string;
  status: 'active' | 'waiting' | 'maintenance' | 'inactive' | 'disconnected';
  position: [number, number];
  capacity: string;
  objective: string;
  type: 'manufacturing' | 'rocket' | 'memory' | 'power';
  battery: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  origin: string;
  originCoords: [number, number];
  destination: string;
  destCoords: [number, number];
  loadDetails: string;
  requirements: string[];
  progress: number;
  stage: string;
}

export interface Session {
  id: string;
  name: string;
  status: 'active' | 'secondary';
  ip: string;
  loginTime: string;
  mac?: string;
  os?: string;
}
