import { supabase } from './supabase';
import { randomUUID } from 'crypto';

const DOCTOR_ID = 'a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd';

const PATIENTS = [
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "age": 45,
    "dob": "12/05/1978",
    "gender": "Male",
    "bloodType": "O+",
    "phone": "(555) 123-4567",
    "email": "john.doe@email.com",
    "address": "123 Maple St, NY",
    "photo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300",
    "initials": "JD",
    "time": "12:00 PM",
    "status": "Waiting",
    "allergies": [
      {
        "name": "Penicillin",
        "severity": "Anaphylaxis"
      },
      {
        "name": "Shellfish",
        "severity": "Hives"
      }
    ],
    "chronicConditions": [
      "Hypertension (Controlled)",
      "Type 2 Diabetes (Diet controlled)",
      "Hyperlipidemia"
    ],
    "vitals": {
      "bp": "120/80",
      "hr": "72 bpm",
      "weight": "185 lbs"
    },
    "pastTests": [
      {
        "date": "Oct 12, 2023",
        "name": "Complete Blood Count (CBC)",
        "result": "Normal",
        "resultClass": "normal"
      },
      {
        "date": "Sep 05, 2023",
        "name": "Lipid Panel",
        "result": "Elevated",
        "resultClass": "elevated"
      },
      {
        "date": "Jan 22, 2023",
        "name": "ECG",
        "result": "Normal",
        "resultClass": "normal"
      }
    ],
    "surgicalHistory": [
      {
        "name": "Appendectomy",
        "date": "Mar 2015",
        "description": "Uncomplicated laparoscopic removal. Full recovery noted.",
        "checked": false
      },
      {
        "name": "Knee Arthroscopy (Right)",
        "date": "Nov 2008",
        "description": "Meniscus repair. Physical therapy completed successfully.",
        "checked": true
      }
    ]
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Alice Johnson",
    "age": 34,
    "dob": "04/18/1992",
    "gender": "Female",
    "bloodType": "A+",
    "phone": "(555) 987-6543",
    "email": "alice.j@email.com",
    "address": "456 Oak Ave, Brooklyn, NY",
    "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300",
    "initials": "AJ",
    "time": "09:00 AM",
    "status": "In Progress",
    "allergies": [
      {
        "name": "Sulfa Drugs",
        "severity": "Rash"
      }
    ],
    "chronicConditions": [
      "Asthma (Mild intermittent)"
    ],
    "vitals": {
      "bp": "115/75",
      "hr": "68 bpm",
      "weight": "135 lbs"
    },
    "pastTests": [
      {
        "date": "Nov 02, 2023",
        "name": "Spirometry Pulmonary Function",
        "result": "Normal",
        "resultClass": "normal"
      }
    ],
    "surgicalHistory": []
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Bob Smith",
    "age": 61,
    "dob": "08/22/1964",
    "gender": "Male",
    "bloodType": "B-",
    "phone": "(555) 456-7890",
    "email": "bob.smith@email.com",
    "address": "789 Pine Rd, Queens, NY",
    "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300",
    "initials": "BS",
    "time": "10:30 AM",
    "status": "Waiting",
    "allergies": [],
    "chronicConditions": [
      "Gastroesophageal Reflux Disease (GERD)",
      "Osteoarthritis"
    ],
    "vitals": {
      "bp": "128/82",
      "hr": "76 bpm",
      "weight": "210 lbs"
    },
    "pastTests": [
      {
        "date": "Dec 15, 2023",
        "name": "Basic Metabolic Panel (BMP)",
        "result": "Normal",
        "resultClass": "normal"
      }
    ],
    "surgicalHistory": [
      {
        "name": "Gallbladder Removal",
        "date": "Jun 2018",
        "description": "Laparoscopic cholecystectomy. Recovered without complications.",
        "checked": true
      }
    ]
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "Carol Davis",
    "age": 52,
    "dob": "11/03/1973",
    "gender": "Female",
    "bloodType": "AB+",
    "phone": "(555) 321-7654",
    "email": "carol.d@email.com",
    "address": "321 Elm St, Staten Island, NY",
    "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300",
    "initials": "CD",
    "time": "11:15 AM",
    "status": "Waiting",
    "allergies": [
      {
        "name": "Aspirin",
        "severity": "Angioedema"
      }
    ],
    "chronicConditions": [
      "Hypothyroidism"
    ],
    "vitals": {
      "bp": "118/76",
      "hr": "64 bpm",
      "weight": "155 lbs"
    },
    "pastTests": [
      {
        "date": "Aug 14, 2023",
        "name": "TSH Thyroid Panel",
        "result": "Normal",
        "resultClass": "normal"
      }
    ],
    "surgicalHistory": []
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "name": "Evan Wright",
    "age": 29,
    "dob": "02/14/1997",
    "gender": "Male",
    "bloodType": "O-",
    "phone": "(555) 789-0123",
    "email": "evan.wright@email.com",
    "address": "567 Birch Blvd, Bronx, NY",
    "photo": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=300",
    "initials": "EW",
    "time": "08:00 AM",
    "status": "Done",
    "allergies": [],
    "chronicConditions": [],
    "vitals": {
      "bp": "110/70",
      "hr": "60 bpm",
      "weight": "168 lbs"
    },
    "pastTests": [
      {
        "date": "Jan 05, 2024",
        "name": "Annual Blood Chemistry",
        "result": "Normal",
        "resultClass": "normal"
      }
    ],
    "surgicalHistory": []
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Sarah Jenkins",
    "age": 40,
    "dob": "09/15/1985",
    "gender": "Female",
    "bloodType": "A-",
    "phone": "(555) 234-5678",
    "email": "sarah.jenkins@email.com",
    "address": "789 Maple St, Queens, NY",
    "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300",
    "initials": "SJ",
    "time": "10:00 AM",
    "status": "Waiting",
    "allergies": [],
    "chronicConditions": [],
    "vitals": {
      "bp": "120/80",
      "hr": "70 bpm",
      "weight": "140 lbs"
    },
    "pastTests": [],
    "surgicalHistory": []
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "name": "David Miller",
    "age": 55,
    "dob": "11/22/1970",
    "gender": "Male",
    "bloodType": "O+",
    "phone": "(555) 876-5432",
    "email": "david.miller@email.com",
    "address": "101 Oak Ave, Brooklyn, NY",
    "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300",
    "initials": "DM",
    "time": "11:30 AM",
    "status": "Waiting",
    "allergies": [],
    "chronicConditions": [],
    "vitals": {
      "bp": "130/85",
      "hr": "75 bpm",
      "weight": "190 lbs"
    },
    "pastTests": [],
    "surgicalHistory": []
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440012",
    "name": "Elena Rostova",
    "age": 33,
    "dob": "05/14/1993",
    "gender": "Female",
    "bloodType": "B+",
    "phone": "(555) 345-6789",
    "email": "elena.r@email.com",
    "address": "222 Pine Rd, Staten Island, NY",
    "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300",
    "initials": "ER",
    "time": "02:00 PM",
    "status": "Waiting",
    "allergies": [],
    "chronicConditions": [],
    "vitals": {
      "bp": "115/70",
      "hr": "65 bpm",
      "weight": "125 lbs"
    },
    "pastTests": [],
    "surgicalHistory": []
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440013",
    "name": "Marcus Thompson",
    "age": 38,
    "dob": "03/02/1988",
    "gender": "Male",
    "bloodType": "AB-",
    "phone": "(555) 901-2345",
    "email": "marcus.t@email.com",
    "address": "444 Elm St, Bronx, NY",
    "photo": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=300",
    "initials": "MT",
    "time": "03:30 PM",
    "status": "Waiting",
    "allergies": [],
    "chronicConditions": [],
    "vitals": {
      "bp": "122/78",
      "hr": "72 bpm",
      "weight": "180 lbs"
    },
    "pastTests": [],
    "surgicalHistory": []
  }
];

const MEDICINES = [
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110001",
    "name": "Amoxicillin 500mg Capsule",
    "stock": 120
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110002",
    "name": "Lisinopril 10mg Tablet",
    "stock": 0
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110003",
    "name": "Atorvastatin 20mg Tablet",
    "stock": 85
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110004",
    "name": "Metformin 500mg Tablet",
    "stock": 150
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110005",
    "name": "Albuterol HFA",
    "stock": 40
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110006",
    "name": "Omeprazole 20mg Capsule",
    "stock": 65
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110007",
    "name": "Levothyroxine 75mcg Tablet",
    "stock": 95
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110008",
    "name": "Acetaminophen 500mg Tablet",
    "stock": 98
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110009",
    "name": "Ibuprofen 400mg Tablet",
    "stock": 143
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110010",
    "name": "Aspirin 81mg Tablet",
    "stock": 30
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110011",
    "name": "Azithromycin 250mg Tablet",
    "stock": 75
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110012",
    "name": "Ciprofloxacin 500mg Tablet",
    "stock": 151
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110013",
    "name": "Cephalexin 500mg Capsule",
    "stock": 154
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110014",
    "name": "Amlodipine 5mg Tablet",
    "stock": 37
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110015",
    "name": "Metoprolol Succinate 50mg ER Tablet",
    "stock": 92
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110016",
    "name": "Simvastatin 20mg Tablet",
    "stock": 66
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110017",
    "name": "Losartan Potassium 50mg Tablet",
    "stock": 32
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110018",
    "name": "Gabapentin 300mg Capsule",
    "stock": 33
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110019",
    "name": "Sertraline HCl 50mg Tablet",
    "stock": 14
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110020",
    "name": "Montelukast Sodium 10mg Tablet",
    "stock": 84
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110021",
    "name": "Fluticasone Propionate 50mcg Spray",
    "stock": 141
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110022",
    "name": "Furosemide 40mg Tablet",
    "stock": 83
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110023",
    "name": "Pantoprazole Sodium 40mg Tablet",
    "stock": 18
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110024",
    "name": "Prednisone 10mg Tablet",
    "stock": 49
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110025",
    "name": "Escitalopram Oxalate 10mg Tablet",
    "stock": 32
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110026",
    "name": "Fluoxetine HCl 20mg Capsule",
    "stock": 16
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110027",
    "name": "Tramadol HCl 50mg Tablet",
    "stock": 140
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110028",
    "name": "Insulin Glargine 100 U/mL",
    "stock": 48
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110029",
    "name": "Bupropion HCl 150mg XL Tablet",
    "stock": 78
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110030",
    "name": "Rosuvastatin Calcium 10mg Tablet",
    "stock": 116
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110031",
    "name": "Pravastatin Sodium 20mg Tablet",
    "stock": 154
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110032",
    "name": "Trazodone HCl 50mg Tablet",
    "stock": 66
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110033",
    "name": "Carvedilol 6.25mg Tablet",
    "stock": 11
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110034",
    "name": "Meloxicam 15mg Tablet",
    "stock": 130
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110035",
    "name": "Duloxetine HCl 30mg Capsule",
    "stock": 44
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110036",
    "name": "Alprazolam 0.5mg Tablet",
    "stock": 79
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110037",
    "name": "Citalopram Hydrobromide 20mg Tablet",
    "stock": 114
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110038",
    "name": "Potassium Chloride 20mEq ER Tablet",
    "stock": 92
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110039",
    "name": "Clonazepam 1mg Tablet",
    "stock": 125
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110040",
    "name": "Amitriptyline HCl 25mg Tablet",
    "stock": 111
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110041",
    "name": "Alendronate Sodium 70mg Tablet",
    "stock": 150
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110042",
    "name": "Allopurinol 100mg Tablet",
    "stock": 104
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110043",
    "name": "Venlafaxine HCl 75mg ER Capsule",
    "stock": 109
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110044",
    "name": "Oxycodone HCl 5mg Tablet",
    "stock": 143
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110045",
    "name": "Lorazepam 1mg Tablet",
    "stock": 76
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110046",
    "name": "Warfarin Sodium 5mg Tablet",
    "stock": 143
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110047",
    "name": "Tamsulosin HCl 0.4mg Capsule",
    "stock": 90
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110048",
    "name": "Spironolactone 25mg Tablet",
    "stock": 91
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110049",
    "name": "Naproxen 500mg Tablet",
    "stock": 16
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110050",
    "name": "Hydralazine HCl 25mg Tablet",
    "stock": 113
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110051",
    "name": "Propranolol HCl 20mg Tablet",
    "stock": 139
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110052",
    "name": "Diazepam 5mg Tablet",
    "stock": 26
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110053",
    "name": "Hydrochlorothiazide 25mg Tablet",
    "stock": 55
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110054",
    "name": "Doxycycline Hyclate 100mg Capsule",
    "stock": 30
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110055",
    "name": "Methylprednisolone 4mg Dosepack",
    "stock": 102
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110056",
    "name": "Finasteride 5mg Tablet",
    "stock": 16
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110057",
    "name": "Zolpidem Tartrate 10mg Tablet",
    "stock": 155
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110058",
    "name": "Cetirizine HCl 10mg Tablet",
    "stock": 121
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110059",
    "name": "Loratadine 10mg Tablet",
    "stock": 133
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110060",
    "name": "Fexofenadine HCl 180mg Tablet",
    "stock": 79
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110061",
    "name": "Diphenhydramine HCl 25mg Capsule",
    "stock": 137
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110062",
    "name": "Famotidine 20mg Tablet",
    "stock": 30
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110063",
    "name": "Lansoprazole 15mg Capsule",
    "stock": 159
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110064",
    "name": "Esomeprazole Magnesium 40mg Capsule",
    "stock": 84
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110065",
    "name": "Rabeprazole Sodium 20mg Tablet",
    "stock": 128
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110066",
    "name": "Clopidogrel Bisulfate 75mg Tablet",
    "stock": 32
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110067",
    "name": "Apixaban 5mg Tablet",
    "stock": 75
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110068",
    "name": "Rivaroxaban 20mg Tablet",
    "stock": 143
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110069",
    "name": "Dabigatran Etexilate 150mg Capsule",
    "stock": 143
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110070",
    "name": "Enoxaparin Sodium 40mg/0.4mL Injection",
    "stock": 67
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110071",
    "name": "Heparin Sodium 5000 U/mL Injection",
    "stock": 115
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110072",
    "name": "Valsartan 80mg Tablet",
    "stock": 136
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110073",
    "name": "Candesartan Cilexetil 16mg Tablet",
    "stock": 24
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110074",
    "name": "Olmesartan Medoxomil 20mg Tablet",
    "stock": 141
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110075",
    "name": "Ramipril 5mg Capsule",
    "stock": 21
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110076",
    "name": "Benazepril HCl 10mg Tablet",
    "stock": 95
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110077",
    "name": "Enalapril Maleate 10mg Tablet",
    "stock": 29
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110078",
    "name": "Atenolol 50mg Tablet",
    "stock": 91
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110079",
    "name": "Bisoprolol Fumarate 5mg Tablet",
    "stock": 39
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110080",
    "name": "Nebivolol HCl 5mg Tablet",
    "stock": 79
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110081",
    "name": "Clonidine HCl 0.1mg Tablet",
    "stock": 92
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110082",
    "name": "Doxazosin Mesylate 2mg Tablet",
    "stock": 24
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110083",
    "name": "Terazosin HCl 5mg Capsule",
    "stock": 115
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110084",
    "name": "Prazosin HCl 1mg Capsule",
    "stock": 20
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110085",
    "name": "Carisoprodol 350mg Tablet",
    "stock": 88
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110086",
    "name": "Cyclobenzaprine HCl 10mg Tablet",
    "stock": 65
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110087",
    "name": "Baclofen 10mg Tablet",
    "stock": 115
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110088",
    "name": "Tizanidine HCl 4mg Tablet",
    "stock": 40
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110089",
    "name": "Methocarbamol 750mg Tablet",
    "stock": 143
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110090",
    "name": "Celecoxib 200mg Capsule",
    "stock": 130
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110091",
    "name": "Diclofenac Sodium 75mg DR Tablet",
    "stock": 87
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110092",
    "name": "Ketorolac Tromethamine 10mg Tablet",
    "stock": 47
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110093",
    "name": "Nabumetone 500mg Tablet",
    "stock": 128
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110094",
    "name": "Indomethacin 25mg Capsule",
    "stock": 37
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110095",
    "name": "Pregabalin 75mg Capsule",
    "stock": 129
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110096",
    "name": "Topiramate 50mg Tablet",
    "stock": 91
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110097",
    "name": "Lamotrigine 100mg Tablet",
    "stock": 24
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110098",
    "name": "Levetiracetam 500mg Tablet",
    "stock": 42
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110099",
    "name": "Divalproex Sodium 500mg ER Tablet",
    "stock": 21
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110100",
    "name": "Carbamazepine 200mg Tablet",
    "stock": 133
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110101",
    "name": "Oxcarbazepine 300mg Tablet",
    "stock": 18
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110102",
    "name": "Phenytoin Sodium 100mg ER Capsule",
    "stock": 75
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110103",
    "name": "Paroxetine HCl 20mg Tablet",
    "stock": 149
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110104",
    "name": "Fluvoxamine Maleate 50mg Tablet",
    "stock": 83
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110105",
    "name": "Desvenlafaxine 50mg ER Tablet",
    "stock": 128
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110106",
    "name": "Mirtazapine 15mg Tablet",
    "stock": 42
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110107",
    "name": "Aripiprazole 10mg Tablet",
    "stock": 115
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110108",
    "name": "Quetiapine Fumarate 100mg Tablet",
    "stock": 115
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110109",
    "name": "Olanzapine 5mg Tablet",
    "stock": 101
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110110",
    "name": "Risperidone 1mg Tablet",
    "stock": 95
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110111",
    "name": "Ziprasidone HCl 40mg Capsule",
    "stock": 47
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110112",
    "name": "Haloperidol 2mg Tablet",
    "stock": 140
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110113",
    "name": "Lithium Carbonate 300mg Capsule",
    "stock": 20
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110114",
    "name": "Donepezil HCl 10mg Tablet",
    "stock": 33
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110115",
    "name": "Memantine HCl 10mg Tablet",
    "stock": 68
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110116",
    "name": "Rivastigmine Tartrate 1.5mg Capsule",
    "stock": 31
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110117",
    "name": "Galantamine hydrobromide 8mg ER Capsule",
    "stock": 29
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110118",
    "name": "Carbidopa-Levodopa 25-100mg Tablet",
    "stock": 43
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110119",
    "name": "Pramipexole Dihydrochloride 0.25mg Tablet",
    "stock": 59
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110120",
    "name": "Ropinirole HCl 1mg Tablet",
    "stock": 148
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110121",
    "name": "Selegiline HCl 5mg Capsule",
    "stock": 36
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110122",
    "name": "Rasagiline Mesylate 1mg Tablet",
    "stock": 45
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110123",
    "name": "Benztropine Mesylate 1mg Tablet",
    "stock": 53
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110124",
    "name": "Sumatriptan Succinate 50mg Tablet",
    "stock": 54
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110125",
    "name": "Rizatriptan Benzoate 10mg ODT",
    "stock": 150
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110126",
    "name": "Zolmitriptan 2.5mg Tablet",
    "stock": 62
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110127",
    "name": "Eletriptan Hydrobromide 40mg Tablet",
    "stock": 129
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110128",
    "name": "Ondansetron HCl 4mg ODT",
    "stock": 49
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110129",
    "name": "Metoclopramide HCl 10mg Tablet",
    "stock": 146
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110130",
    "name": "Promethazine HCl 25mg Tablet",
    "stock": 111
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110131",
    "name": "Meclizine HCl 25mg Tablet",
    "stock": 158
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110132",
    "name": "Dicyclomine HCl 20mg Tablet",
    "stock": 22
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110133",
    "name": "Hyoscyamine Sulfate 0.125mg sublingual",
    "stock": 35
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110134",
    "name": "Mesalamine 1.2g DR Tablet",
    "stock": 28
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110135",
    "name": "Sulfasalazine 500mg Tablet",
    "stock": 105
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110136",
    "name": "Budesonide 3mg EC Capsule",
    "stock": 147
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110137",
    "name": "Prednisolone Sodium Phosphate 15mg/5mL Syrup",
    "stock": 24
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110138",
    "name": "Dexamethasone 4mg Tablet",
    "stock": 26
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110139",
    "name": "Hydrocortisone 10mg Tablet",
    "stock": 35
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110140",
    "name": "Fludrocortisone Acetate 0.1mg Tablet",
    "stock": 122
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110141",
    "name": "Liothyronine Sodium 25mcg Tablet",
    "stock": 43
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110142",
    "name": "Methimazole 5mg Tablet",
    "stock": 89
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110143",
    "name": "Propylthiouracil 50mg Tablet",
    "stock": 55
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110144",
    "name": "Dutasteride 0.5mg Capsule",
    "stock": 117
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110145",
    "name": "Alfuzosin HCl 10mg ER Tablet",
    "stock": 59
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110146",
    "name": "Silodosin 8mg Capsule",
    "stock": 111
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110147",
    "name": "Sildenafil Citrate 50mg Tablet",
    "stock": 94
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110148",
    "name": "Tadalafil 10mg Tablet",
    "stock": 157
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110149",
    "name": "Vardenafil HCl 10mg Tablet",
    "stock": 132
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110150",
    "name": "Oxybutynin Chloride 5mg ER Tablet",
    "stock": 31
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110151",
    "name": "Tolterodine Tartrate 2mg ER Capsule",
    "stock": 65
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110152",
    "name": "Solifenacin Succinate 5mg Tablet",
    "stock": 109
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110153",
    "name": "Darifenacin Hydrobromide 7.5mg ER Tablet",
    "stock": 44
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110154",
    "name": "Mirabegron 25mg ER Tablet",
    "stock": 146
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110155",
    "name": "Phenazopyridine HCl 100mg Tablet",
    "stock": 56
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110156",
    "name": "Nitrofurantoin Monohydrate/Macrocrystals 100mg Capsule",
    "stock": 32
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110157",
    "name": "Sulfamethoxazole-Trimethoprim 800-160mg DS Tablet",
    "stock": 148
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110158",
    "name": "Fosfomycin Tromethamine 3g Packet",
    "stock": 134
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110159",
    "name": "Metronidazole 500mg Tablet",
    "stock": 77
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110160",
    "name": "Clindamycin Phosphate 150mg Capsule",
    "stock": 17
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110161",
    "name": "Linezolid 600mg Tablet",
    "stock": 35
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110162",
    "name": "Vancomycin HCl 125mg Capsule",
    "stock": 76
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110163",
    "name": "Erythromycin Base 250mg Tablet",
    "stock": 35
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110164",
    "name": "Clarithromycin 500mg Tablet",
    "stock": 42
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110165",
    "name": "Minocycline HCl 100mg Capsule",
    "stock": 70
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110166",
    "name": "Terbinafine HCl 250mg Tablet",
    "stock": 108
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110167",
    "name": "Itraconazole 100mg Capsule",
    "stock": 70
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110168",
    "name": "Fluconazole 150mg Tablet",
    "stock": 48
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110169",
    "name": "Ketoconazole 200mg Tablet",
    "stock": 27
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110170",
    "name": "Nystatin 100,000 U/g Cream",
    "stock": 93
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110171",
    "name": "Acyclovir 400mg Tablet",
    "stock": 29
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110172",
    "name": "Valacyclovir HCl 500mg Tablet",
    "stock": 119
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110173",
    "name": "Famciclovir 250mg Tablet",
    "stock": 130
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110174",
    "name": "Oseltamivir Phosphate 75mg Capsule",
    "stock": 37
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110175",
    "name": "Baloxavir Marboxil 40mg Tablet",
    "stock": 129
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110176",
    "name": "Chlorthalidone 25mg Tablet",
    "stock": 41
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110177",
    "name": "Indapamide 2.5mg Tablet",
    "stock": 53
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110178",
    "name": "Triamterene-HCTZ 37.5-25mg Capsule",
    "stock": 81
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110179",
    "name": "Amiloride HCl 5mg Tablet",
    "stock": 128
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110180",
    "name": "Eplerenone 25mg Tablet",
    "stock": 104
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110181",
    "name": "Gemfibrozil 600mg Tablet",
    "stock": 149
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110182",
    "name": "Fenofibrate 145mg Tablet",
    "stock": 94
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110183",
    "name": "Ezetimibe 10mg Tablet",
    "stock": 130
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110184",
    "name": "Colesevelam HCl 625mg Tablet",
    "stock": 71
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110185",
    "name": "Cholestyramine Light Powder Packet",
    "stock": 130
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110186",
    "name": "Glipizide 5mg XL Tablet",
    "stock": 17
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110187",
    "name": "Glimepiride 4mg Tablet",
    "stock": 67
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110188",
    "name": "Pioglitazone HCl 30mg Tablet",
    "stock": 97
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110189",
    "name": "Sitagliptin Phosphate 100mg Tablet",
    "stock": 58
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110190",
    "name": "Liraglutide 18mg/3mL Pen",
    "stock": 66
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110191",
    "name": "Empagliflozin 10mg Tablet",
    "stock": 69
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110192",
    "name": "Canagliflozin 100mg Tablet",
    "stock": 16
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110193",
    "name": "Dapagliflozin 10mg Tablet",
    "stock": 148
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110194",
    "name": "Acarbose 50mg Tablet",
    "stock": 121
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110195",
    "name": "Methotrexate 2.5mg Tablet",
    "stock": 131
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110196",
    "name": "Leflunomide 20mg Tablet",
    "stock": 83
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110197",
    "name": "Hydroxychloroquine Sulfate 200mg Tablet",
    "stock": 125
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110198",
    "name": "Sulfasalazine 500mg EN-tab",
    "stock": 65
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110199",
    "name": "Azathioprine 50mg Tablet",
    "stock": 156
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110200",
    "name": "Cyclosporine Modified 100mg Capsule",
    "stock": 107
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110201",
    "name": "Tacrolimus 1mg Capsule",
    "stock": 33
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110202",
    "name": "Mycophenolate Mofetil 250mg Capsule",
    "stock": 82
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110203",
    "name": "Colchicine 0.6mg Tablet",
    "stock": 12
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110204",
    "name": "Febuxostat 40mg Tablet",
    "stock": 156
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110205",
    "name": "Probenecid 500mg Tablet",
    "stock": 14
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110206",
    "name": "Sotalol HCl 80mg Tablet",
    "stock": 131
  },
  {
    "id": "9f9d7df9-7be8-466d-9642-882200110207",
    "name": "Amiodarone HCl 200mg Tablet",
    "stock": 98
  }
];


async function seed() {
  console.log('Cleaning up existing data...');
  
  // Wipe child records first, then parent records
  await supabase.from('prescription_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('prescriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('medical_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('doctor_details').delete().neq('doctor_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('medicine_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Inserting medicine inventory...');
  const medicineInserts = MEDICINES.map(med => ({
    id: med.id,
    medicine_name: med.name,
    current_stock: med.stock,
    reorder_threshold: 10,
    repeatedly_used: true
  }));
  const { error: medErr } = await supabase.from('medicine_inventory').insert(medicineInserts);
  if (medErr) throw medErr;

  console.log('Generating 20 doctor records...');
  const profiles: any[] = [];
  const doctorDetails: any[] = [];
  const doctorIds: string[] = [];

  // Hardcoded doctor to avoid frontend UI constraint issues
  const primaryDocId = '22222222-2222-2222-2222-222222222222';
  doctorIds.push(primaryDocId);
  profiles.push({
    id: primaryDocId,
    full_name: 'Dr. Anita Desai',
    role: 'doctor',
    contact_number: '(555) 019-2834'
  });
  doctorDetails.push({
    doctor_id: primaryDocId,
    specialty: 'Cardiology',
    room_number: 'Wing B, Room 402',
    is_available: true
  });

  // Generate 19 more doctors
  for (let i = 1; i < 20; i++) {
    const isFemale = Math.random() > 0.5;
    let fName = getRandomElement(isFemale ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE);
    let lName = getRandomElement(LAST_NAMES);
    
    if (i === 1) {
      fName = 'James';
      lName = 'Wilson';
    }
    
    const docId = randomUUID();
    doctorIds.push(docId);
    
    profiles.push({
      id: docId,
      full_name: `Dr. ${fName} ${lName}`,
      role: 'doctor',
      contact_number: `(555) ${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`
    });

    doctorDetails.push({
      doctor_id: docId,
      specialty: SPECIALTIES[i % SPECIALTIES.length],
      room_number: `Building ${getRandomElement(['A', 'B', 'C'])}, Room ${getRandomInt(100, 500)}`,
      is_available: Math.random() > 0.15
    });
  }

  console.log('Generating 90 patient records...');
  const patientIds: string[] = [];
  const patientNames: string[] = [];
  const patientPhones: string[] = [];

  for (let i = 0; i < 90; i++) {
    const isFemale = Math.random() > 0.5;
    const fName = getRandomElement(isFemale ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE);
    const lName = getRandomElement(LAST_NAMES);
    const pId = randomUUID();
    const phone = `(555) ${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`;
    const fullName = `${fName} ${lName}`;

    patientIds.push(pId);
    patientNames.push(fullName);
    patientPhones.push(phone);

    profiles.push({
      id: pId,
      full_name: fullName,
      role: 'patient',
      contact_number: phone
    });
  }

  // Bulk insert all profiles (doctors & patients)
  console.log(`Inserting ${profiles.length} profiles into DB...`);
  const { error: profsErr } = await supabase.from('profiles').insert(profiles);
  if (profsErr) throw profsErr;

  // Bulk insert doctor details
  console.log(`Inserting ${doctorDetails.length} doctor details into DB...`);
  const { error: docsErr } = await supabase.from('doctor_details').insert(doctorDetails);
  if (docsErr) throw docsErr;

  console.log('Generating medical records, appointments, and prescriptions...');
  const medicalRecords: any[] = [];
  const appointments: any[] = [];
  const prescriptions: any[] = [];
  const prescriptionItems: any[] = [];

  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 90; i++) {
    const pId = patientIds[i];
    const fullName = patientNames[i];
    const phone = patientPhones[i];
    const assocDocId = getRandomElement(doctorIds); // Assign a primary doctor for this patient's records

    const gender = Math.random() > 0.5 ? 'Female' : 'Male';
    const age = getRandomInt(18, 85);
    const birthYear = new Date().getFullYear() - age;
    const dob = `${getRandomInt(1, 12).toString().padStart(2, '0')}/${getRandomInt(1, 28).toString().padStart(2, '0')}/${birthYear}`;
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    const email = `${fullName.toLowerCase().replace(/\s+/g, '.')}@email.com`;
    const bloodType = getRandomElement(BLOOD_TYPES);
    const address = `${getRandomInt(100, 999)} ${getRandomElement(['Maple St', 'Oak Ave', 'Pine Rd', 'Elm St', 'Birch Blvd'])}, New York, NY`;
    const photo = getRandomPhoto(gender);

    // 1. Demographics Record
    medicalRecords.push({
      patient_id: pId,
      doctor_id: assocDocId,
      record_type: 'demographics',
      description: JSON.stringify({
        dob,
        gender,
        bloodType,
        photo,
        age,
        address,
        email,
        initials
      }),
      record_date: todayStr
    });

    // 2. Vitals Record
    const bpSystolic = getRandomInt(110, 138);
    const bpDiastolic = getRandomInt(68, 88);
    const hr = getRandomInt(60, 92);
    const weight = getRandomInt(110, 230);
    medicalRecords.push({
      patient_id: pId,
      doctor_id: assocDocId,
      record_type: 'vitals',
      description: JSON.stringify({
        bp: `${bpSystolic}/${bpDiastolic}`,
        hr: `${hr} bpm`,
        weight: `${weight} lbs`
      }),
      record_date: todayStr
    });

    // 3. Allergies (0 to 2 per patient)
    const numAllergies = getRandomInt(0, 2);
    if (numAllergies > 0) {
      const selectedAllergies = getRandomElements(ALLERGIES_LIST, numAllergies);
      for (const allergy of selectedAllergies) {
        medicalRecords.push({
          patient_id: pId,
          doctor_id: assocDocId,
          record_type: 'allergy',
          description: JSON.stringify(allergy),
          record_date: todayStr
        });
      }
    }

    // 4. Chronic Conditions (0 to 2 per patient)
    const numConditions = getRandomInt(0, 2);
    if (numConditions > 0) {
      const selectedConditions = getRandomElements(CHRONIC_CONDITIONS_LIST, numConditions);
      for (const cond of selectedConditions) {
        medicalRecords.push({
          patient_id: pId,
          doctor_id: assocDocId,
          record_type: 'chronic_condition',
          description: cond,
          record_date: todayStr
        });
      }
    }

    // 5. Past Tests (1 to 3 per patient)
    const numTests = getRandomInt(1, 3);
    const selectedTests = getRandomElements(TESTS_LIST, numTests);
    const testDates = ['Oct 12, 2025', 'Nov 02, 2025', 'Dec 15, 2025', 'Jan 05, 2026', 'Feb 14, 2026', 'Mar 20, 2026'];
    for (let t = 0; t < selectedTests.length; t++) {
      const test = selectedTests[t];
      medicalRecords.push({
        patient_id: pId,
        doctor_id: assocDocId,
        record_type: 'test_result',
        description: JSON.stringify({
          date: testDates[t % testDates.length],
          name: test.name,
          result: test.result,
          resultClass: test.resultClass
        }),
        record_date: todayStr
      });
    }

    // 6. Surgical History (0 to 1 per patient)
    if (Math.random() > 0.6) {
      const surgery = getRandomElement(SURGERIES_LIST);
      const surgeryYear = getRandomInt(2010, 2025);
      const surgeryMonths = ['Jan', 'Mar', 'Jun', 'Aug', 'Nov'];
      medicalRecords.push({
        patient_id: pId,
        doctor_id: assocDocId,
        record_type: 'surgical_history',
        description: JSON.stringify({
          name: surgery.name,
          date: `${getRandomElement(surgeryMonths)} ${surgeryYear}`,
          description: surgery.description,
          checked: Math.random() > 0.5
        }),
        record_date: todayStr
      });
    }

    // 7. Appointment (scheduled on today's date at various times)
    const apptHour = getRandomInt(8, 17); // 8 AM to 5 PM
    const apptMin = getRandomElement([0, 15, 30, 45]);
    const scheduledTime = new Date();
    scheduledTime.setHours(apptHour, apptMin, 0, 0);

    appointments.push({
      patient_id: pId,
      doctor_id: assocDocId,
      scheduled_time: scheduledTime.toISOString(),
      status: getRandomElement(STATUS_LIST)
    });

    // 8. Prescription (50% chance of prescription)
    if (Math.random() > 0.5) {
      const rxId = randomUUID();
      prescriptions.push({
        id: rxId,
        patient_id: pId,
        doctor_id: assocDocId,
        status: getRandomElement(RX_STATUS_LIST),
        doctor_comments: 'Patient to follow up in 2 weeks.'
      });

      // Prescription items (1 to 2 items)
      const numItems = getRandomInt(1, 2);
      const selectedMeds = getRandomElements(MEDICINES, numItems);
      for (const med of selectedMeds) {
        prescriptionItems.push({
          prescription_id: rxId,
          medicine_id: med.id,
          dosage: getRandomElement(DOSAGES),
          quantity: getRandomInt(10, 90)
        });
      }
    }
  }

  // Bulk insert medical records (chunks of 100 to avoid limits)
  console.log(`Inserting ${medicalRecords.length} medical records...`);
  for (let k = 0; k < medicalRecords.length; k += 100) {
    const chunk = medicalRecords.slice(k, k + 100);
    const { error: mrErr } = await supabase.from('medical_records').insert(chunk);
    if (mrErr) throw mrErr;
  }

  // Bulk insert appointments
  console.log(`Inserting ${appointments.length} appointments...`);
  const { error: apptErr } = await supabase.from('appointments').insert(appointments);
  if (apptErr) throw apptErr;

  // Bulk insert prescriptions
  if (prescriptions.length > 0) {
    console.log(`Inserting ${prescriptions.length} prescriptions...`);
    const { error: rxErr } = await supabase.from('prescriptions').insert(prescriptions);
    if (rxErr) throw rxErr;
  }

  // Bulk insert prescription items
  if (prescriptionItems.length > 0) {
    console.log(`Inserting ${prescriptionItems.length} prescription items...`);
    const { error: rxItemsErr } = await supabase.from('prescription_items').insert(prescriptionItems);
    if (rxItemsErr) throw rxItemsErr;
  }

function mapStatus(status?: string): string {
  if (status === 'In Progress') return 'in_progress';
  if (status === 'Done') return 'completed';
  return 'scheduled'; // Default for 'Waiting'
}

seed().catch(err => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
