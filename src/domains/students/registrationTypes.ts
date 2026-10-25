export interface StudentDetails {
  student_name: string;
  subject: string;
  subjects?: string[];
  student_phone: string;
  student_email: string;
}

export interface ParentDetails {
  parent_name: string;
  parent_phone: string;
  parent_email: string;
}

export interface PackageDetails {
  plan_type: string;
  currency: string;
  package_price: string;
  per_class: string;
  classes_purchased: string;
  class_duration: string;
}

export interface ScheduleItem {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface RegistrationFormData {
  student: StudentDetails;
  parent: ParentDetails;
  pkg: PackageDetails;
  schedules: ScheduleItem[];
}

export interface RegistrationErrors {
  student?: Partial<Record<keyof StudentDetails, string>>;
  parent?: Partial<Record<keyof ParentDetails, string>>;
  pkg?: Partial<Record<keyof PackageDetails, string>>;
  schedules?: Record<string, string>;
}
