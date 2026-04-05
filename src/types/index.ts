export interface PetRecord {
  id: number;
  petName: string;
  ownerName: string;
  type: string;
  status: '治疗中' | '已康复' | '观察中';
  lastVisit: string;
  phone?: string;
}

export interface Appointment {
  id: number;
  time: string;
  pet: string;
  owner: string;
  doctor: string;
  reason: string;
  status: 'TODO' | 'DOING' | 'DONE';
  isUrgent?: boolean;
}

export interface Doctor {
  id: number;
  name: string;
  department: string;
  title: string;
  avatar: string;
  rating: number;
  status: '出诊中' | '手术中' | '休息' | '急救中' | '学术会';
  experience: string;
  fee?: number;
}

export interface Medicine {
  id: number;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  status: '充足' | '紧缺' | '缺货告警';
}

export interface Inpatient {
  id: number;
  petName: string;
  type: string;
  owner: string;
  room: string;
  diagnosis: string;
  admissionDate: string;
  status: '危重' | '稳定' | '观察中';
  doctorId: number;
  phone?: string;
}
