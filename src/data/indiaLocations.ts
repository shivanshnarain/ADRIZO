// Authoritative India States, UTs, Districts, Locations & Postal PIN Codes
// Sources: 
// 1. Government of India Local Government Directory (LGD) & Census 2011 Directory
// 2. India Post Official All-India Pincode Directory (data.gov.in)

export interface LocationItem {
  locationName: string;
  pincodes: string[];
  tier: 1 | 2 | 3;
}

export interface DistrictData {
  districtName: string;
  locations: LocationItem[];
}

export interface StateData {
  stateName: string;
  code: string;
  type: 'STATE' | 'UT';
  districts: DistrictData[];
}

// All 36 Indian States and Union Territories in STRICT A -> Z Alphabetical Order
export const INDIA_LOCATIONS: StateData[] = [
  {
    stateName: 'Andaman and Nicobar Islands',
    code: 'AN',
    type: 'UT',
    districts: [
      {
        districtName: 'Nicobar',
        locations: [
          { locationName: 'Car Nicobar', pincodes: ['744301'], tier: 3 },
          { locationName: 'Great Nicobar (Campbell Bay)', pincodes: ['744302'], tier: 3 },
          { locationName: 'Nancowry', pincodes: ['744303'], tier: 3 },
        ],
      },
      {
        districtName: 'North and Middle Andaman',
        locations: [
          { locationName: 'Mayabunder', pincodes: ['744204'], tier: 3 },
          { locationName: 'Diglipur', pincodes: ['744202'], tier: 3 },
          { locationName: 'Rangat', pincodes: ['744205'], tier: 3 },
        ],
      },
      {
        districtName: 'South Andaman',
        locations: [
          { locationName: 'Port Blair', pincodes: ['744101', '744102', '744103', '744105'], tier: 2 },
          { locationName: 'Ferrargunj', pincodes: ['744206'], tier: 3 },
          { locationName: 'Little Andaman (Hut Bay)', pincodes: ['744207'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Andhra Pradesh',
    code: 'AP',
    type: 'STATE',
    districts: [
      {
        districtName: 'Alluri Sitharama Raju',
        locations: [
          { locationName: 'Paderu', pincodes: ['531024', '531077'], tier: 3 },
          { locationName: 'Araku Valley', pincodes: ['531149'], tier: 3 },
          { locationName: 'Rampachodavaram', pincodes: ['533288'], tier: 3 },
        ],
      },
      {
        districtName: 'Anakapalli',
        locations: [
          { locationName: 'Anakapalli Town', pincodes: ['531001', '531002'], tier: 2 },
          { locationName: 'Chodavaram', pincodes: ['531036'], tier: 3 },
          { locationName: 'Yelamanchili', pincodes: ['531055'], tier: 3 },
        ],
      },
      {
        districtName: 'Ananthapuramu',
        locations: [
          { locationName: 'Anantapur City', pincodes: ['515001', '515002', '515004'], tier: 2 },
          { locationName: 'Guntakal', pincodes: ['515801', '515803'], tier: 2 },
          { locationName: 'Tadipatri', pincodes: ['515411'], tier: 3 },
        ],
      },
      {
        districtName: 'Annamayya',
        locations: [
          { locationName: 'Rayachoti', pincodes: ['516269', '516270'], tier: 3 },
          { locationName: 'Madanapalle', pincodes: ['517325', '517326'], tier: 2 },
          { locationName: 'Rajampet', pincodes: ['516115'], tier: 3 },
        ],
      },
      {
        districtName: 'Bapatla',
        locations: [
          { locationName: 'Bapatla Town', pincodes: ['522101'], tier: 3 },
          { locationName: 'Chirala', pincodes: ['523155', '523156', '523157'], tier: 2 },
          { locationName: 'Repalle', pincodes: ['522265'], tier: 3 },
        ],
      },
      {
        districtName: 'Chittoor',
        locations: [
          { locationName: 'Chittoor City', pincodes: ['517001', '517002'], tier: 2 },
          { locationName: 'Punganur', pincodes: ['517247'], tier: 3 },
          { locationName: 'Nagari', pincodes: ['517590'], tier: 3 },
        ],
      },
      {
        districtName: 'East Godavari',
        locations: [
          { locationName: 'Rajamahendravaram (Rajahmundry)', pincodes: ['533101', '533103', '533105'], tier: 2 },
          { locationName: 'Kovvur', pincodes: ['534350'], tier: 3 },
          { locationName: 'Nidadavole', pincodes: ['534301'], tier: 3 },
        ],
      },
      {
        districtName: 'Eluru',
        locations: [
          { locationName: 'Eluru City', pincodes: ['534001', '534002', '534005'], tier: 2 },
          { locationName: 'Jangareddigudem', pincodes: ['534447'], tier: 3 },
          { locationName: 'Nuzvid', pincodes: ['521201'], tier: 3 },
        ],
      },
      {
        districtName: 'Guntur',
        locations: [
          { locationName: 'Guntur City', pincodes: ['522001', '522002', '522004', '522006'], tier: 2 },
          { locationName: 'Tenali', pincodes: ['522201', '522202'], tier: 2 },
          { locationName: 'Mangalagiri', pincodes: ['522503'], tier: 2 },
        ],
      },
      {
        districtName: 'Kakinada',
        locations: [
          { locationName: 'Kakinada City', pincodes: ['533001', '533002', '533003', '533004'], tier: 2 },
          { locationName: 'Peddapuram', pincodes: ['533437'], tier: 3 },
          { locationName: 'Pithapuram', pincodes: ['533450'], tier: 3 },
          { locationName: 'Tuni', pincodes: ['533401'], tier: 3 },
        ],
      },
      {
        districtName: 'Konaseema (Dr. B.R. Ambedkar)',
        locations: [
          { locationName: 'Amalapuram', pincodes: ['533201'], tier: 3 },
          { locationName: 'Ramachandrapuram', pincodes: ['533255'], tier: 3 },
          { locationName: 'Razole', pincodes: ['533242'], tier: 3 },
        ],
      },
      {
        districtName: 'Krishna',
        locations: [
          { locationName: 'Machilipatnam', pincodes: ['521001', '521002'], tier: 2 },
          { locationName: 'Gudivada', pincodes: ['521301'], tier: 2 },
          { locationName: 'Vuyyuru', pincodes: ['521165'], tier: 3 },
        ],
      },
      {
        districtName: 'Kurnool',
        locations: [
          { locationName: 'Kurnool City', pincodes: ['518001', '518002', '518003'], tier: 2 },
          { locationName: 'Adoni', pincodes: ['518301', '518302'], tier: 2 },
          { locationName: 'Yemmiganur', pincodes: ['518360'], tier: 3 },
        ],
      },
      {
        districtName: 'Nandyal',
        locations: [
          { locationName: 'Nandyal Town', pincodes: ['518501', '518502'], tier: 2 },
          { locationName: 'Allagadda', pincodes: ['518543'], tier: 3 },
          { locationName: 'Dhone', pincodes: ['518222'], tier: 3 },
        ],
      },
      {
        districtName: 'NTR',
        locations: [
          { locationName: 'Vijayawada Central & One Town', pincodes: ['520001', '520002', '520003'], tier: 1 },
          { locationName: 'Vijayawada Governorpet & Benz Circle', pincodes: ['520008', '520010', '520012'], tier: 1 },
          { locationName: 'Ibrahimpatnam', pincodes: ['521456'], tier: 3 },
          { locationName: 'Jaggayyapet', pincodes: ['521175'], tier: 3 },
        ],
      },
      {
        districtName: 'Palnadu',
        locations: [
          { locationName: 'Narasaraopet', pincodes: ['522601'], tier: 2 },
          { locationName: 'Chilakaluripet', pincodes: ['522616'], tier: 3 },
          { locationName: 'Sattenapalle', pincodes: ['522403'], tier: 3 },
        ],
      },
      {
        districtName: 'Prakasam',
        locations: [
          { locationName: 'Ongole City', pincodes: ['523001', '523002'], tier: 2 },
          { locationName: 'Markapur', pincodes: ['523316'], tier: 3 },
          { locationName: 'Giddalur', pincodes: ['523357'], tier: 3 },
        ],
      },
      {
        districtName: 'Sri Potti Sriramulu Nellore',
        locations: [
          { locationName: 'Nellore City', pincodes: ['524001', '524002', '524003', '524004'], tier: 2 },
          { locationName: 'Kavali', pincodes: ['524201'], tier: 2 },
          { locationName: 'Gudur', pincodes: ['524101'], tier: 3 },
        ],
      },
      {
        districtName: 'Sri Sathya Sai',
        locations: [
          { locationName: 'Puttaparthi', pincodes: ['515134'], tier: 3 },
          { locationName: 'Dharmavaram', pincodes: ['515671'], tier: 3 },
          { locationName: 'Kadiri', pincodes: ['515591'], tier: 3 },
          { locationName: 'Hindupur', pincodes: ['515201', '515202'], tier: 2 },
        ],
      },
      {
        districtName: 'Srikakulam',
        locations: [
          { locationName: 'Srikakulam City', pincodes: ['532001'], tier: 2 },
          { locationName: 'Amadalavalasa', pincodes: ['532185'], tier: 3 },
          { locationName: 'Palasa Kasibugga', pincodes: ['532221'], tier: 3 },
        ],
      },
      {
        districtName: 'Tirupati',
        locations: [
          { locationName: 'Tirupati City', pincodes: ['517501', '517502', '517507'], tier: 2 },
          { locationName: 'Srikalahasti', pincodes: ['517644'], tier: 2 },
          { locationName: 'Chandragiri', pincodes: ['517101'], tier: 3 },
          { locationName: 'Sullurpeta', pincodes: ['524121'], tier: 3 },
        ],
      },
      {
        districtName: 'Visakhapatnam',
        locations: [
          { locationName: 'Visakhapatnam MVP Colony / Siripuram', pincodes: ['530002', '530003', '530017'], tier: 1 },
          { locationName: 'Visakhapatnam Gajuwaka / Steel Plant', pincodes: ['530026', '530031', '530032'], tier: 1 },
          { locationName: 'Visakhapatnam Madhurawada', pincodes: ['530041', '530048'], tier: 1 },
          { locationName: 'Bheemunipatnam', pincodes: ['531163'], tier: 3 },
        ],
      },
      {
        districtName: 'Vizianagaram',
        locations: [
          { locationName: 'Vizianagaram City', pincodes: ['535001', '535002', '535003'], tier: 2 },
          { locationName: 'Bobbili', pincodes: ['535558'], tier: 3 },
          { locationName: 'Parvathipuram', pincodes: ['535501'], tier: 3 },
        ],
      },
      {
        districtName: 'West Godavari',
        locations: [
          { locationName: 'Bhimavaram', pincodes: ['534201', '534202'], tier: 2 },
          { locationName: 'Tadepalligudem', pincodes: ['534101'], tier: 2 },
          { locationName: 'Palakollu', pincodes: ['534260'], tier: 3 },
          { locationName: 'Tanuku', pincodes: ['534211'], tier: 3 },
        ],
      },
      {
        districtName: 'YSR (Kadapa)',
        locations: [
          { locationName: 'Kadapa City', pincodes: ['516001', '516002', '516004'], tier: 2 },
          { locationName: 'Proddatur', pincodes: ['516360', '516361'], tier: 2 },
          { locationName: 'Pulivendula', pincodes: ['516390'], tier: 3 },
          { locationName: 'Jammalamadugu', pincodes: ['516434'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Arunachal Pradesh',
    code: 'AR',
    type: 'STATE',
    districts: [
      {
        districtName: 'Papum Pare',
        locations: [
          { locationName: 'Itanagar', pincodes: ['791111'], tier: 2 },
          { locationName: 'Naharlagun', pincodes: ['791110'], tier: 2 },
          { locationName: 'Yupia', pincodes: ['791112'], tier: 3 },
        ],
      },
      {
        districtName: 'Changlang',
        locations: [
          { locationName: 'Changlang Town', pincodes: ['792120'], tier: 3 },
          { locationName: 'Miao', pincodes: ['792122'], tier: 3 },
        ],
      },
      {
        districtName: 'East Siang',
        locations: [
          { locationName: 'Pasighat', pincodes: ['791102'], tier: 2 },
          { locationName: 'Ruksin', pincodes: ['791103'], tier: 3 },
        ],
      },
      {
        districtName: 'Tawang',
        locations: [
          { locationName: 'Tawang Town', pincodes: ['790104'], tier: 3 },
          { locationName: 'Jang', pincodes: ['790105'], tier: 3 },
        ],
      },
      {
        districtName: 'West Kameng',
        locations: [
          { locationName: 'Bomdila', pincodes: ['790001'], tier: 3 },
          { locationName: 'Bhalukpong', pincodes: ['790114'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Assam',
    code: 'AS',
    type: 'STATE',
    districts: [
      {
        districtName: 'Kamrup Metropolitan',
        locations: [
          { locationName: 'Guwahati Pan Bazar & Paltan Bazar', pincodes: ['781001', '781008'], tier: 1 },
          { locationName: 'Guwahati Dispur & GS Road', pincodes: ['781005', '781006'], tier: 1 },
          { locationName: 'Guwahati Jalukbari / Maligaon', pincodes: ['781011', '781014'], tier: 1 },
        ],
      },
      {
        districtName: 'Cachar',
        locations: [
          { locationName: 'Silchar', pincodes: ['788001', '788002', '788005'], tier: 2 },
          { locationName: 'Lakhipur', pincodes: ['788103'], tier: 3 },
        ],
      },
      {
        districtName: 'Dibrugarh',
        locations: [
          { locationName: 'Dibrugarh City', pincodes: ['786001', '786003', '786004'], tier: 2 },
          { locationName: 'Naharkatiya', pincodes: ['786610'], tier: 3 },
          { locationName: 'Chabua', pincodes: ['786184'], tier: 3 },
        ],
      },
      {
        districtName: 'Jorhat',
        locations: [
          { locationName: 'Jorhat City', pincodes: ['785001', '785006', '785008'], tier: 2 },
          { locationName: 'Mariani', pincodes: ['785634'], tier: 3 },
          { locationName: 'Titabar', pincodes: ['785630'], tier: 3 },
        ],
      },
      {
        districtName: 'Nagaon',
        locations: [
          { locationName: 'Nagaon Town', pincodes: ['782001', '782002'], tier: 2 },
          { locationName: 'Hojai', pincodes: ['782435'], tier: 3 },
          { locationName: 'Kaliabor', pincodes: ['782137'], tier: 3 },
        ],
      },
      {
        districtName: 'Sonitpur',
        locations: [
          { locationName: 'Tezpur', pincodes: ['784001', '784025'], tier: 2 },
          { locationName: 'Dhekiajuli', pincodes: ['784110'], tier: 3 },
        ],
      },
      {
        districtName: 'Tinsukia',
        locations: [
          { locationName: 'Tinsukia City', pincodes: ['786125', '786145'], tier: 2 },
          { locationName: 'Digboi', pincodes: ['786171'], tier: 3 },
          { locationName: 'Doomdooma', pincodes: ['786151'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Bihar',
    code: 'BR',
    type: 'STATE',
    districts: [
      {
        districtName: 'Patna',
        locations: [
          { locationName: 'Patna GPO / Fraser Road', pincodes: ['800001', '800003'], tier: 1 },
          { locationName: 'Patna Kankarbagh / Rajendra Nagar', pincodes: ['800016', '800020'], tier: 1 },
          { locationName: 'Patna Bailey Road / Boring Road', pincodes: ['800001', '800013', '800014'], tier: 1 },
          { locationName: 'Danapur Cantt', pincodes: ['801503'], tier: 2 },
          { locationName: 'Barh', pincodes: ['803213'], tier: 3 },
          { locationName: 'Mokama', pincodes: ['803302'], tier: 3 },
        ],
      },
      {
        districtName: 'Bhagalpur',
        locations: [
          { locationName: 'Bhagalpur City', pincodes: ['812001', '812002', '812007'], tier: 2 },
          { locationName: 'Kahalgaon', pincodes: ['813203'], tier: 3 },
          { locationName: 'Naugachia', pincodes: ['853204'], tier: 3 },
        ],
      },
      {
        districtName: 'Darbhanga',
        locations: [
          { locationName: 'Darbhanga City', pincodes: ['846001', '846004', '846005'], tier: 2 },
          { locationName: 'Benipur', pincodes: ['847103'], tier: 3 },
        ],
      },
      {
        districtName: 'Gaya',
        locations: [
          { locationName: 'Gaya City', pincodes: ['823001', '823002'], tier: 2 },
          { locationName: 'Bodh Gaya', pincodes: ['824231'], tier: 2 },
          { locationName: 'Sherghati', pincodes: ['824211'], tier: 3 },
        ],
      },
      {
        districtName: 'Muzaffarpur',
        locations: [
          { locationName: 'Muzaffarpur Town', pincodes: ['842001', '842002', '842003'], tier: 2 },
          { locationName: 'Motipur', pincodes: ['843111'], tier: 3 },
          { locationName: 'Kanti', pincodes: ['843109'], tier: 3 },
        ],
      },
      {
        districtName: 'Nalanda',
        locations: [
          { locationName: 'Bihar Sharif', pincodes: ['803101', '803118'], tier: 2 },
          { locationName: 'Rajgir', pincodes: ['803116'], tier: 2 },
          { locationName: 'Hilsa', pincodes: ['801302'], tier: 3 },
        ],
      },
      {
        districtName: 'Purnia',
        locations: [
          { locationName: 'Purnia City', pincodes: ['854301', '854302'], tier: 2 },
          { locationName: 'Banmankhi', pincodes: ['854202'], tier: 3 },
          { locationName: 'Kasba', pincodes: ['854330'], tier: 3 },
        ],
      },
      {
        districtName: 'Rohtas',
        locations: [
          { locationName: 'Sasaram', pincodes: ['821115'], tier: 2 },
          { locationName: 'Dehri On Sone', pincodes: ['821307'], tier: 2 },
          { locationName: 'Bikramganj', pincodes: ['802212'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Chandigarh',
    code: 'CH',
    type: 'UT',
    districts: [
      {
        districtName: 'Chandigarh',
        locations: [
          { locationName: 'Sector 1 to 11 (Capitol & University)', pincodes: ['160001', '160009', '160011', '160014'], tier: 1 },
          { locationName: 'Sector 14 to 26 (Central & Commercial)', pincodes: ['160017', '160019', '160022'], tier: 1 },
          { locationName: 'Sector 31 to 47 (South)', pincodes: ['160036', '160047'], tier: 1 },
          { locationName: 'Manimajra / IT Park', pincodes: ['160101'], tier: 1 },
        ],
      },
    ],
  },
  {
    stateName: 'Chhattisgarh',
    code: 'CG',
    type: 'STATE',
    districts: [
      {
        districtName: 'Raipur',
        locations: [
          { locationName: 'Raipur City', pincodes: ['492001', '492002', '492004', '492007'], tier: 1 },
          { locationName: 'Nava Raipur (Atal Nagar)', pincodes: ['492018'], tier: 1 },
          { locationName: 'Abhanpur', pincodes: ['493661'], tier: 3 },
        ],
      },
      {
        districtName: 'Bilaspur',
        locations: [
          { locationName: 'Bilaspur City', pincodes: ['495001', '495004'], tier: 2 },
          { locationName: 'Kota', pincodes: ['495113'], tier: 3 },
          { locationName: 'Takhatpur', pincodes: ['495330'], tier: 3 },
        ],
      },
      {
        districtName: 'Durg',
        locations: [
          { locationName: 'Bhilai Steel City', pincodes: ['490001', '490006', '490020'], tier: 2 },
          { locationName: 'Durg City', pincodes: ['491001'], tier: 2 },
          { locationName: 'Patan', pincodes: ['491111'], tier: 3 },
        ],
      },
      {
        districtName: 'Korba',
        locations: [
          { locationName: 'Korba Industrial Area', pincodes: ['495677', '495678'], tier: 2 },
          { locationName: 'Katghora', pincodes: ['495445'], tier: 3 },
        ],
      },
      {
        districtName: 'Rajnandgaon',
        locations: [
          { locationName: 'Rajnandgaon Town', pincodes: ['491441'], tier: 2 },
          { locationName: 'Dongargarh', pincodes: ['491445'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Dadra and Nagar Haveli and Daman and Diu',
    code: 'DN',
    type: 'UT',
    districts: [
      {
        districtName: 'Dadra and Nagar Haveli',
        locations: [
          { locationName: 'Silvassa', pincodes: ['396230', '396235'], tier: 2 },
          { locationName: 'Naroli', pincodes: ['396235'], tier: 3 },
        ],
      },
      {
        districtName: 'Daman',
        locations: [
          { locationName: 'Daman Town', pincodes: ['396210'], tier: 2 },
          { locationName: 'Nani Daman', pincodes: ['396210'], tier: 2 },
          { locationName: 'Moti Daman', pincodes: ['396220'], tier: 2 },
        ],
      },
      {
        districtName: 'Diu',
        locations: [
          { locationName: 'Diu Town', pincodes: ['362520'], tier: 3 },
          { locationName: 'Ghoghla', pincodes: ['362540'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Delhi',
    code: 'DL',
    type: 'UT',
    districts: [
      {
        districtName: 'Central Delhi',
        locations: [
          { locationName: 'Connaught Place / GPO', pincodes: ['110001'], tier: 1 },
          { locationName: 'Daryaganj / Delhi Gate', pincodes: ['110002'], tier: 1 },
          { locationName: 'Karol Bagh / Rajendra Place', pincodes: ['110005'], tier: 1 },
          { locationName: 'Paharganj / New Delhi Rly Station', pincodes: ['110055'], tier: 1 },
        ],
      },
      {
        districtName: 'East Delhi',
        locations: [
          { locationName: 'Preet Vihar / Nirman Vihar', pincodes: ['110092'], tier: 1 },
          { locationName: 'Mayur Vihar Phase 1 & 2', pincodes: ['110091'], tier: 1 },
          { locationName: 'Mayur Vihar Phase 3 / Kondli', pincodes: ['110096'], tier: 1 },
          { locationName: 'Laxmi Nagar / Shakarpur', pincodes: ['110092'], tier: 1 },
          { locationName: 'Anand Vihar / ISBT', pincodes: ['110092'], tier: 1 },
        ],
      },
      {
        districtName: 'New Delhi',
        locations: [
          { locationName: 'Barakhamba / Parliament Street', pincodes: ['110001'], tier: 1 },
          { locationName: 'Chanakyapuri / Diplomatic Enclave', pincodes: ['110021'], tier: 1 },
          { locationName: 'India Gate / Pandara Road', pincodes: ['110003'], tier: 1 },
          { locationName: 'Lodhi Road / Jor Bagh', pincodes: ['110003'], tier: 1 },
        ],
      },
      {
        districtName: 'North Delhi',
        locations: [
          { locationName: 'Civil Lines / Delhi University', pincodes: ['110007', '110054'], tier: 1 },
          { locationName: 'Model Town / GTB Nagar', pincodes: ['110009'], tier: 1 },
          { locationName: 'Chandni Chowk / Red Fort', pincodes: ['110006'], tier: 1 },
          { locationName: 'Sadar Bazar / Kashmere Gate', pincodes: ['110006'], tier: 1 },
        ],
      },
      {
        districtName: 'North East Delhi',
        locations: [
          { locationName: 'Shahdara / Dilshad Garden', pincodes: ['110032', '110095'], tier: 1 },
          { locationName: 'Seelampur / Jafrabad', pincodes: ['110053'], tier: 1 },
          { locationName: 'Yamuna Vihar / Bhajanpura', pincodes: ['110053'], tier: 1 },
          { locationName: 'Karawal Nagar', pincodes: ['110094'], tier: 1 },
        ],
      },
      {
        districtName: 'North West Delhi',
        locations: [
          { locationName: 'Rohini Sector 1 to 15', pincodes: ['110085'], tier: 1 },
          { locationName: 'Rohini Sector 16 to 25', pincodes: ['110086', '110089'], tier: 1 },
          { locationName: 'Pitampura / Netaji Subhash Place', pincodes: ['110034'], tier: 1 },
          { locationName: 'Shalimar Bagh / Ashok Vihar', pincodes: ['110052', '110088'], tier: 1 },
        ],
      },
      {
        districtName: 'Shahdara',
        locations: [
          { locationName: 'Vivek Vihar / Surya Nagar', pincodes: ['110095'], tier: 1 },
          { locationName: 'Jhilmil Industrial Area', pincodes: ['110095'], tier: 1 },
          { locationName: 'Geeta Colony / Gandhi Nagar', pincodes: ['110031'], tier: 1 },
        ],
      },
      {
        districtName: 'South Delhi',
        locations: [
          { locationName: 'Hauz Khas / Green Park', pincodes: ['110016'], tier: 1 },
          { locationName: 'Greater Kailash 1 & 2', pincodes: ['110048'], tier: 1 },
          { locationName: 'Saket / Malviya Nagar', pincodes: ['110017'], tier: 1 },
          { locationName: 'Defence Colony / South Ext', pincodes: ['110024', '110049'], tier: 1 },
        ],
      },
      {
        districtName: 'South East Delhi',
        locations: [
          { locationName: 'Lajpat Nagar / Amar Colony', pincodes: ['110024'], tier: 1 },
          { locationName: 'Nehru Place / Kalkaji', pincodes: ['110019'], tier: 1 },
          { locationName: 'Okhla Industrial Area Ph 1-3', pincodes: ['110020'], tier: 1 },
          { locationName: 'New Friends Colony / Jamia', pincodes: ['110025'], tier: 1 },
          { locationName: 'Sarita Vihar / Jasola', pincodes: ['110076'], tier: 1 },
        ],
      },
      {
        districtName: 'South West Delhi',
        locations: [
          { locationName: 'Dwarka Sector 1 to 12', pincodes: ['110075'], tier: 1 },
          { locationName: 'Dwarka Sector 13 to 23', pincodes: ['110077', '110078'], tier: 1 },
          { locationName: 'Vasant Kunj / Mahipalpur', pincodes: ['110070', '110037'], tier: 1 },
          { locationName: 'Najafgarh', pincodes: ['110043'], tier: 1 },
        ],
      },
      {
        districtName: 'West Delhi',
        locations: [
          { locationName: 'Janakpuri / Uttam Nagar', pincodes: ['110058', '110059'], tier: 1 },
          { locationName: 'Rajouri Garden / Subhash Nagar', pincodes: ['110027'], tier: 1 },
          { locationName: 'Punjabi Bagh / Paschim Vihar', pincodes: ['110026', '110063'], tier: 1 },
          { locationName: 'Patel Nagar / Kirti Nagar', pincodes: ['110008', '110015'], tier: 1 },
          { locationName: 'Tilak Nagar / Vikaspuri', pincodes: ['110018'], tier: 1 },
        ],
      },
    ],
  },
  {
    stateName: 'Goa',
    code: 'GA',
    type: 'STATE',
    districts: [
      {
        districtName: 'North Goa',
        locations: [
          { locationName: 'Panaji (Panjim)', pincodes: ['403001'], tier: 2 },
          { locationName: 'Mapusa', pincodes: ['403507'], tier: 2 },
          { locationName: 'Calangute / Candolim', pincodes: ['403516', '403515'], tier: 2 },
          { locationName: 'Ponda', pincodes: ['403401'], tier: 2 },
          { locationName: 'Bicholim', pincodes: ['403504'], tier: 3 },
        ],
      },
      {
        districtName: 'South Goa',
        locations: [
          { locationName: 'Margao (Madgaon)', pincodes: ['403601', '403602'], tier: 2 },
          { locationName: 'Vasco da Gama', pincodes: ['403802'], tier: 2 },
          { locationName: 'Canacona', pincodes: ['403702'], tier: 3 },
          { locationName: 'Curchorem', pincodes: ['403706'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Gujarat',
    code: 'GJ',
    type: 'STATE',
    districts: [
      {
        districtName: 'Ahmedabad',
        locations: [
          { locationName: 'Ahmedabad Navrangpura / Ashram Road', pincodes: ['380009'], tier: 1 },
          { locationName: 'Ahmedabad Satellite / Bodakdev / SG Highway', pincodes: ['380015', '380054'], tier: 1 },
          { locationName: 'Ahmedabad Maninagar', pincodes: ['380008'], tier: 1 },
          { locationName: 'Ahmedabad Bopal / South Bopal', pincodes: ['380058'], tier: 1 },
          { locationName: 'Sanand', pincodes: ['382110'], tier: 2 },
        ],
      },
      {
        districtName: 'Gandhinagar',
        locations: [
          { locationName: 'Gandhinagar Sector 1 to 30', pincodes: ['382010', '382016', '382024'], tier: 1 },
          { locationName: 'GIFT City', pincodes: ['382355'], tier: 1 },
          { locationName: 'Kalol', pincodes: ['382721'], tier: 2 },
        ],
      },
      {
        districtName: 'Surat',
        locations: [
          { locationName: 'Surat Athwalines / Vesu', pincodes: ['395001', '395007'], tier: 1 },
          { locationName: 'Surat Varachha / Katargam', pincodes: ['395004', '395006'], tier: 1 },
          { locationName: 'Surat Adajan / Rander', pincodes: ['395009'], tier: 1 },
          { locationName: 'Bardoli', pincodes: ['394601'], tier: 2 },
        ],
      },
      {
        districtName: 'Vadodara',
        locations: [
          { locationName: 'Vadodara Alkapuri / Sayajigunj', pincodes: ['390005', '390007'], tier: 1 },
          { locationName: 'Vadodara Manjalpur / Makarpura', pincodes: ['390010', '390011'], tier: 1 },
          { locationName: 'Vadodara Gotri / Vasna', pincodes: ['390021'], tier: 1 },
          { locationName: 'Padra', pincodes: ['391440'], tier: 3 },
        ],
      },
      {
        districtName: 'Rajkot',
        locations: [
          { locationName: 'Rajkot City Central / Yagnik Road', pincodes: ['360001', '360002'], tier: 2 },
          { locationName: 'Rajkot Kalawad Road', pincodes: ['360005'], tier: 2 },
          { locationName: 'Morbi', pincodes: ['363641', '363642'], tier: 2 },
          { locationName: 'Gondal', pincodes: ['360311'], tier: 3 },
        ],
      },
      {
        districtName: 'Bhavnagar',
        locations: [
          { locationName: 'Bhavnagar City', pincodes: ['364001', '364002'], tier: 2 },
          { locationName: 'Alang', pincodes: ['364150'], tier: 3 },
        ],
      },
      {
        districtName: 'Jamnagar',
        locations: [
          { locationName: 'Jamnagar City', pincodes: ['361001', '361008'], tier: 2 },
          { locationName: 'Moti Khavdi (Reliance Greens)', pincodes: ['361140'], tier: 2 },
        ],
      },
      {
        districtName: 'Kutch',
        locations: [
          { locationName: 'Bhuj', pincodes: ['370001'], tier: 2 },
          { locationName: 'Gandhidham', pincodes: ['370201'], tier: 2 },
          { locationName: 'Kandla', pincodes: ['370210'], tier: 2 },
          { locationName: 'Mundra', pincodes: ['370421'], tier: 2 },
        ],
      },
    ],
  },
  {
    stateName: 'Haryana',
    code: 'HR',
    type: 'STATE',
    districts: [
      {
        districtName: 'Gurugram',
        locations: [
          { locationName: 'Cyber City / DLF Phase 1-5', pincodes: ['122002', '122009'], tier: 1 },
          { locationName: 'Golf Course Road / Ext', pincodes: ['122003', '122011'], tier: 1 },
          { locationName: 'Sohna Road / Sector 47-57', pincodes: ['122018'], tier: 1 },
          { locationName: 'Manesar Industrial Town', pincodes: ['122051'], tier: 1 },
          { locationName: 'Sohna Town', pincodes: ['122103'], tier: 2 },
        ],
      },
      {
        districtName: 'Faridabad',
        locations: [
          { locationName: 'Faridabad NIT Sectors', pincodes: ['121001', '121002'], tier: 1 },
          { locationName: 'Faridabad Sector 14-21', pincodes: ['121006', '121007'], tier: 1 },
          { locationName: 'Ballabgarh', pincodes: ['121004'], tier: 2 },
        ],
      },
      {
        districtName: 'Ambala',
        locations: [
          { locationName: 'Ambala Cantt', pincodes: ['133001'], tier: 2 },
          { locationName: 'Ambala City', pincodes: ['134003'], tier: 2 },
        ],
      },
      {
        districtName: 'Hisar',
        locations: [
          { locationName: 'Hisar City', pincodes: ['125001', '125005'], tier: 2 },
          { locationName: 'Hansi', pincodes: ['125033'], tier: 3 },
        ],
      },
      {
        districtName: 'Karnal',
        locations: [
          { locationName: 'Karnal City', pincodes: ['132001'], tier: 2 },
          { locationName: 'Gharaunda', pincodes: ['132114'], tier: 3 },
        ],
      },
      {
        districtName: 'Panipat',
        locations: [
          { locationName: 'Panipat Industrial City', pincodes: ['132103', '132140'], tier: 2 },
          { locationName: 'Samalkha', pincodes: ['132101'], tier: 3 },
        ],
      },
      {
        districtName: 'Panchkula',
        locations: [
          { locationName: 'Panchkula Sector 1 to 20', pincodes: ['134109', '134112', '134113'], tier: 1 },
          { locationName: 'Kalka', pincodes: ['133302'], tier: 2 },
        ],
      },
      {
        districtName: 'Rohtak',
        locations: [
          { locationName: 'Rohtak City', pincodes: ['124001'], tier: 2 },
          { locationName: 'Meham', pincodes: ['124112'], tier: 3 },
        ],
      },
      {
        districtName: 'Sonipat',
        locations: [
          { locationName: 'Sonipat City', pincodes: ['131001'], tier: 2 },
          { locationName: 'Kundli Industrial Area', pincodes: ['131028'], tier: 1 },
          { locationName: 'Murthal', pincodes: ['131027'], tier: 2 },
        ],
      },
    ],
  },
  {
    stateName: 'Himachal Pradesh',
    code: 'HP',
    type: 'STATE',
    districts: [
      {
        districtName: 'Shimla',
        locations: [
          { locationName: 'Shimla Mall Road & GPO', pincodes: ['171001'], tier: 2 },
          { locationName: 'Sanjauli', pincodes: ['171006'], tier: 2 },
          { locationName: 'Kufri', pincodes: ['171012'], tier: 3 },
          { locationName: 'Rampur Bushahr', pincodes: ['172001'], tier: 3 },
        ],
      },
      {
        districtName: 'Kangra',
        locations: [
          { locationName: 'Dharamshala', pincodes: ['176215'], tier: 2 },
          { locationName: 'McLeod Ganj', pincodes: ['176219'], tier: 2 },
          { locationName: 'Palampur', pincodes: ['176061'], tier: 2 },
          { locationName: 'Kangra Town', pincodes: ['176001'], tier: 2 },
        ],
      },
      {
        districtName: 'Kullu',
        locations: [
          { locationName: 'Kullu Town', pincodes: ['175101'], tier: 2 },
          { locationName: 'Manali', pincodes: ['175131'], tier: 2 },
        ],
      },
      {
        districtName: 'Mandi',
        locations: [
          { locationName: 'Mandi Town', pincodes: ['175001'], tier: 2 },
          { locationName: 'Sundernagar', pincodes: ['175002'], tier: 3 },
        ],
      },
      {
        districtName: 'Solan',
        locations: [
          { locationName: 'Solan Town', pincodes: ['173212'], tier: 2 },
          { locationName: 'Baddi Industrial Area', pincodes: ['173205'], tier: 2 },
          { locationName: 'Nalagarh', pincodes: ['174101'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Jammu and Kashmir',
    code: 'JK',
    type: 'UT',
    districts: [
      {
        districtName: 'Srinagar',
        locations: [
          { locationName: 'Srinagar Lal Chowk & GPO', pincodes: ['190001'], tier: 2 },
          { locationName: 'Rajbagh', pincodes: ['190008'], tier: 2 },
          { locationName: 'Hazratbal', pincodes: ['190006'], tier: 2 },
        ],
      },
      {
        districtName: 'Jammu',
        locations: [
          { locationName: 'Jammu Tawi / Gandhi Nagar', pincodes: ['180001', '180004'], tier: 2 },
          { locationName: 'Bahu Plaza / Channi Himmat', pincodes: ['180012', '180015'], tier: 2 },
          { locationName: 'Akhnoor', pincodes: ['181201'], tier: 3 },
        ],
      },
      {
        districtName: 'Anantnag',
        locations: [
          { locationName: 'Anantnag Town', pincodes: ['192101'], tier: 3 },
          { locationName: 'Pahalgam', pincodes: ['192126'], tier: 3 },
        ],
      },
      {
        districtName: 'Baramulla',
        locations: [
          { locationName: 'Baramulla Town', pincodes: ['193101'], tier: 3 },
          { locationName: 'Gulmarg', pincodes: ['193403'], tier: 3 },
          { locationName: 'Sopore', pincodes: ['193201'], tier: 3 },
        ],
      },
      {
        districtName: 'Udhampur',
        locations: [
          { locationName: 'Udhampur Town', pincodes: ['182101'], tier: 3 },
          { locationName: 'Katra (Vaishno Devi)', pincodes: ['182301'], tier: 2 },
        ],
      },
    ],
  },
  {
    stateName: 'Jharkhand',
    code: 'JH',
    type: 'STATE',
    districts: [
      {
        districtName: 'Ranchi',
        locations: [
          { locationName: 'Ranchi Main Road / Doranda', pincodes: ['834001', '834002'], tier: 2 },
          { locationName: 'Ranchi Kanke / Morabadi', pincodes: ['834006', '834008'], tier: 2 },
          { locationName: 'Hatia', pincodes: ['834003'], tier: 2 },
        ],
      },
      {
        districtName: 'East Singhbhum (Jamshedpur)',
        locations: [
          { locationName: 'Jamshedpur Bistupur / Sakchi', pincodes: ['831001'], tier: 2 },
          { locationName: 'Jamshedpur Telco / Kadma', pincodes: ['831004', '831005'], tier: 2 },
          { locationName: 'Ghatshila', pincodes: ['832303'], tier: 3 },
        ],
      },
      {
        districtName: 'Dhanbad',
        locations: [
          { locationName: 'Dhanbad City', pincodes: ['826001'], tier: 2 },
          { locationName: 'Jharia', pincodes: ['828111'], tier: 3 },
          { locationName: 'Sindri', pincodes: ['828122'], tier: 3 },
        ],
      },
      {
        districtName: 'Bokaro',
        locations: [
          { locationName: 'Bokaro Steel City', pincodes: ['827001', '827004'], tier: 2 },
          { locationName: 'Chas', pincodes: ['827013'], tier: 2 },
        ],
      },
      {
        districtName: 'Deoghar',
        locations: [
          { locationName: 'Deoghar Town', pincodes: ['814112'], tier: 2 },
          { locationName: 'Madhupur', pincodes: ['815353'], tier: 3 },
        ],
      },
      {
        districtName: 'Hazaribagh',
        locations: [
          { locationName: 'Hazaribagh Town', pincodes: ['825301'], tier: 2 },
          { locationName: 'Barhi', pincodes: ['825405'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Karnataka',
    code: 'KA',
    type: 'STATE',
    districts: [
      {
        districtName: 'Bengaluru Urban',
        locations: [
          { locationName: 'Bengaluru MG Road / Indiranagar', pincodes: ['560001', '560038'], tier: 1 },
          { locationName: 'Bengaluru Koramangala / HSR Layout', pincodes: ['560034', '560102'], tier: 1 },
          { locationName: 'Bengaluru Whitefield / ITPL', pincodes: ['560066'], tier: 1 },
          { locationName: 'Bengaluru Electronic City', pincodes: ['560100'], tier: 1 },
          { locationName: 'Bengaluru Hebbal / Yelahanka', pincodes: ['560024', '560064'], tier: 1 },
          { locationName: 'Bengaluru Jayanagar / JP Nagar', pincodes: ['560011', '560078'], tier: 1 },
        ],
      },
      {
        districtName: 'Mysuru',
        locations: [
          { locationName: 'Mysuru City', pincodes: ['570001', '570004', '570020'], tier: 2 },
          { locationName: 'Nanjangud', pincodes: ['571301'], tier: 3 },
          { locationName: 'Hunsur', pincodes: ['571105'], tier: 3 },
        ],
      },
      {
        districtName: 'Dakshina Kannada (Mangaluru)',
        locations: [
          { locationName: 'Mangaluru City', pincodes: ['575001', '575002', '575003'], tier: 2 },
          { locationName: 'Surathkal', pincodes: ['575014'], tier: 2 },
          { locationName: 'Bantwal', pincodes: ['574211'], tier: 3 },
        ],
      },
      {
        districtName: 'Belagavi',
        locations: [
          { locationName: 'Belagavi City', pincodes: ['590001', '590016'], tier: 2 },
          { locationName: 'Gokak', pincodes: ['591307'], tier: 3 },
          { locationName: 'Chikkodi', pincodes: ['591201'], tier: 3 },
        ],
      },
      {
        districtName: 'Dharwad (Hubballi-Dharwad)',
        locations: [
          { locationName: 'Hubballi (Hubli)', pincodes: ['580020', '580029'], tier: 2 },
          { locationName: 'Dharwad City', pincodes: ['580001'], tier: 2 },
        ],
      },
      {
        districtName: 'Kalaburagi (Gulbarga)',
        locations: [
          { locationName: 'Kalaburagi City', pincodes: ['585101', '585102'], tier: 2 },
          { locationName: 'Sedam', pincodes: ['585222'], tier: 3 },
        ],
      },
      {
        districtName: 'Udupi',
        locations: [
          { locationName: 'Udupi Town', pincodes: ['576101'], tier: 2 },
          { locationName: 'Manipal', pincodes: ['576104'], tier: 2 },
          { locationName: 'Kundapura', pincodes: ['576201'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Kerala',
    code: 'KL',
    type: 'STATE',
    districts: [
      {
        districtName: 'Ernakulam (Kochi)',
        locations: [
          { locationName: 'Kochi MG Road & Marine Drive', pincodes: ['682011', '682031'], tier: 1 },
          { locationName: 'Kochi Kakkanad (Infopark)', pincodes: ['682030', '682042'], tier: 1 },
          { locationName: 'Kochi Edapally / Palarivattom', pincodes: ['682024', '682025'], tier: 1 },
          { locationName: 'Aluva', pincodes: ['683101'], tier: 2 },
          { locationName: 'Angamaly', pincodes: ['683572'], tier: 2 },
        ],
      },
      {
        districtName: 'Thiruvananthapuram',
        locations: [
          { locationName: 'Thiruvananthapuram City GPO', pincodes: ['695001'], tier: 1 },
          { locationName: 'Technopark / Kazhakkoottam', pincodes: ['695581', '695582'], tier: 1 },
          { locationName: 'Kowdiar / Pattom', pincodes: ['695003', '695004'], tier: 1 },
          { locationName: 'Neyyattinkara', pincodes: ['695121'], tier: 3 },
        ],
      },
      {
        districtName: 'Kozhikode (Calicut)',
        locations: [
          { locationName: 'Kozhikode City', pincodes: ['673001', '673004'], tier: 2 },
          { locationName: 'Feroke', pincodes: ['673631'], tier: 3 },
          { locationName: 'Vadakara', pincodes: ['673101'], tier: 3 },
        ],
      },
      {
        districtName: 'Thrissur',
        locations: [
          { locationName: 'Thrissur Town (Swaraj Round)', pincodes: ['680001'], tier: 2 },
          { locationName: 'Chalakudy', pincodes: ['680307'], tier: 2 },
          { locationName: 'Guruvayur', pincodes: ['680101'], tier: 2 },
        ],
      },
      {
        districtName: 'Kollam',
        locations: [
          { locationName: 'Kollam City', pincodes: ['691001'], tier: 2 },
          { locationName: 'Karunagappally', pincodes: ['690518'], tier: 3 },
        ],
      },
      {
        districtName: 'Kannur',
        locations: [
          { locationName: 'Kannur City', pincodes: ['670001'], tier: 2 },
          { locationName: 'Thalassery', pincodes: ['670101'], tier: 2 },
          { locationName: 'Payyanur', pincodes: ['670307'], tier: 3 },
        ],
      },
      {
        districtName: 'Kottayam',
        locations: [
          { locationName: 'Kottayam Town', pincodes: ['686001'], tier: 2 },
          { locationName: 'Changanassery', pincodes: ['686101'], tier: 3 },
          { locationName: 'Pala', pincodes: ['686575'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Ladakh',
    code: 'LA',
    type: 'UT',
    districts: [
      {
        districtName: 'Leh',
        locations: [
          { locationName: 'Leh Main Bazaar & GPO', pincodes: ['194101'], tier: 2 },
          { locationName: 'Choglamsar', pincodes: ['194104'], tier: 3 },
          { locationName: 'Nubra (Diskit)', pincodes: ['194401'], tier: 3 },
        ],
      },
      {
        districtName: 'Kargil',
        locations: [
          { locationName: 'Kargil Town', pincodes: ['194103'], tier: 3 },
          { locationName: 'Drass', pincodes: ['194102'], tier: 3 },
          { locationName: 'Sankoo', pincodes: ['194109'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Lakshadweep',
    code: 'LD',
    type: 'UT',
    districts: [
      {
        districtName: 'Lakshadweep',
        locations: [
          { locationName: 'Kavaratti', pincodes: ['682555'], tier: 3 },
          { locationName: 'Agatti', pincodes: ['682553'], tier: 3 },
          { locationName: 'Amini', pincodes: ['682552'], tier: 3 },
          { locationName: 'Andrott', pincodes: ['682551'], tier: 3 },
          { locationName: 'Minicoy', pincodes: ['682559'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Madhya Pradesh',
    code: 'MP',
    type: 'STATE',
    districts: [
      {
        districtName: 'Indore',
        locations: [
          { locationName: 'Indore MG Road / Rajwada', pincodes: ['452001', '452002'], tier: 1 },
          { locationName: 'Indore Vijay Nagar / Palasia', pincodes: ['452010', '452018'], tier: 1 },
          { locationName: 'Indore Rau / Silicon City', pincodes: ['453331'], tier: 1 },
          { locationName: 'Mhow (Dr. Ambedkar Nagar)', pincodes: ['453441'], tier: 2 },
        ],
      },
      {
        districtName: 'Bhopal',
        locations: [
          { locationName: 'Bhopal MP Nagar / Arera Colony', pincodes: ['462011', '462016'], tier: 1 },
          { locationName: 'Bhopal TT Nagar / New Market', pincodes: ['462003'], tier: 1 },
          { locationName: 'Bhopal Kolar Road / Hoshangabad Rd', pincodes: ['462042', '462026'], tier: 1 },
          { locationName: 'Bhopal Bairagarh', pincodes: ['462030'], tier: 2 },
        ],
      },
      {
        districtName: 'Gwalior',
        locations: [
          { locationName: 'Gwalior Lashkar / City Centre', pincodes: ['474001', '474011'], tier: 2 },
          { locationName: 'Gwalior Morar', pincodes: ['474006'], tier: 2 },
          { locationName: 'Dabra', pincodes: ['475110'], tier: 3 },
        ],
      },
      {
        districtName: 'Jabalpur',
        locations: [
          { locationName: 'Jabalpur Civil Lines & Cantt', pincodes: ['482001'], tier: 2 },
          { locationName: 'Jabalpur Wright Town / Napier Town', pincodes: ['482002'], tier: 2 },
          { locationName: 'Sihora', pincodes: ['483225'], tier: 3 },
        ],
      },
      {
        districtName: 'Ujjain',
        locations: [
          { locationName: 'Ujjain City', pincodes: ['456001', '456006', '456010'], tier: 2 },
          { locationName: 'Nagda', pincodes: ['456335'], tier: 3 },
        ],
      },
      {
        districtName: 'Sagar',
        locations: [
          { locationName: 'Sagar Town', pincodes: ['470001', '470002'], tier: 2 },
          { locationName: 'Bina', pincodes: ['470113'], tier: 3 },
        ],
      },
      {
        districtName: 'Rewa',
        locations: [
          { locationName: 'Rewa City', pincodes: ['486001'], tier: 2 },
          { locationName: 'Mauganj', pincodes: ['486331'], tier: 3 },
        ],
      },
      {
        districtName: 'Satna',
        locations: [
          { locationName: 'Satna Town', pincodes: ['485001'], tier: 2 },
          { locationName: 'Maihar', pincodes: ['485771'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Maharashtra',
    code: 'MH',
    type: 'STATE',
    districts: [
      {
        districtName: 'Mumbai City',
        locations: [
          { locationName: 'Fort / Nariman Point / Colaba', pincodes: ['400001', '400005', '400021'], tier: 1 },
          { locationName: 'Marine Lines / Churchgate / Girgaon', pincodes: ['400002', '400004', '400020'], tier: 1 },
          { locationName: 'Lower Parel / Worli / Prabhadevi', pincodes: ['400013', '400018', '400025'], tier: 1 },
          { locationName: 'Dadar / Matunga / Mahim', pincodes: ['400014', '400016', '400019'], tier: 1 },
        ],
      },
      {
        districtName: 'Mumbai Suburban',
        locations: [
          { locationName: 'Bandra West / Khar West', pincodes: ['400050', '400052'], tier: 1 },
          { locationName: 'Andheri West / Juhu / Lokhandwala', pincodes: ['400049', '400053', '400058'], tier: 1 },
          { locationName: 'Andheri East / MIDC / Marol', pincodes: ['400059', '400069', '400093'], tier: 1 },
          { locationName: 'Borivali / Kandivali / Malad', pincodes: ['400064', '400067', '400091', '400092'], tier: 1 },
          { locationName: 'Ghatkopar / Powai / Vikhroli', pincodes: ['400076', '400077', '400079'], tier: 1 },
          { locationName: 'Mulund / Bhandup', pincodes: ['400078', '400080'], tier: 1 },
        ],
      },
      {
        districtName: 'Thane',
        locations: [
          { locationName: 'Thane West (Naupada / Ghodbunder)', pincodes: ['400601', '400602', '400607', '400615'], tier: 1 },
          { locationName: 'Kalyan / Dombivli', pincodes: ['421201', '421301'], tier: 1 },
          { locationName: 'Ulhasnagar / Ambernath', pincodes: ['421001', '421501'], tier: 2 },
          { locationName: 'Bhiwandi', pincodes: ['421302'], tier: 2 },
          { locationName: 'Mira-Bhayandar', pincodes: ['401105', '401107'], tier: 1 },
        ],
      },
      {
        districtName: 'Pune',
        locations: [
          { locationName: 'Pune Shivaji Nagar / FC Road / Deccan', pincodes: ['411004', '411005'], tier: 1 },
          { locationName: 'Pune Kothrud / Karve Nagar', pincodes: ['411038', '411052'], tier: 1 },
          { locationName: 'Pune Koregaon Park / Kalyani Nagar / Viman Nagar', pincodes: ['411001', '411006', '411014'], tier: 1 },
          { locationName: 'Pune Hinjawadi IT Park', pincodes: ['411057'], tier: 1 },
          { locationName: 'Pimpri-Chinchwad / Nigdi / Wakad', pincodes: ['411018', '411019', '411033', '411044', '411057'], tier: 1 },
          { locationName: 'Baramati', pincodes: ['413102'], tier: 2 },
        ],
      },
      {
        districtName: 'Nagpur',
        locations: [
          { locationName: 'Nagpur Civil Lines / Ramdaspeth', pincodes: ['440001', '440010'], tier: 1 },
          { locationName: 'Nagpur Dharampeth / Sadar', pincodes: ['440001', '440010'], tier: 1 },
          { locationName: 'Nagpur MIHAN / Wardha Road', pincodes: ['441108'], tier: 1 },
          { locationName: 'Kamthi', pincodes: ['441001'], tier: 2 },
        ],
      },
      {
        districtName: 'Nashik',
        locations: [
          { locationName: 'Nashik City / College Road / Gangapur Rd', pincodes: ['422002', '422005', '422013'], tier: 2 },
          { locationName: 'Nashik Road', pincodes: ['422101'], tier: 2 },
          { locationName: 'Malegaon', pincodes: ['423203'], tier: 2 },
          { locationName: 'Sinnar', pincodes: ['422103'], tier: 3 },
        ],
      },
      {
        districtName: 'Chhatrapati Sambhajinagar (Aurangabad)',
        locations: [
          { locationName: 'Aurangabad City', pincodes: ['431001', '431003', '431005'], tier: 2 },
          { locationName: 'Chitegaon Industrial Area', pincodes: ['431105'], tier: 2 },
          { locationName: 'Paithan', pincodes: ['431107'], tier: 3 },
        ],
      },
      {
        districtName: 'Kolhapur',
        locations: [
          { locationName: 'Kolhapur City', pincodes: ['416001', '416003'], tier: 2 },
          { locationName: 'Ichalkaranji', pincodes: ['416115'], tier: 2 },
          { locationName: 'Jaysingpur', pincodes: ['416101'], tier: 3 },
        ],
      },
      {
        districtName: 'Solapur',
        locations: [
          { locationName: 'Solapur City', pincodes: ['413001', '413002'], tier: 2 },
          { locationName: 'Pandharpur', pincodes: ['413304'], tier: 2 },
          { locationName: 'Barshi', pincodes: ['413401'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Manipur',
    code: 'MN',
    type: 'STATE',
    districts: [
      {
        districtName: 'Imphal West',
        locations: [
          { locationName: 'Imphal City', pincodes: ['795001'], tier: 2 },
          { locationName: 'Lamphelpat', pincodes: ['795004'], tier: 3 },
        ],
      },
      {
        districtName: 'Imphal East',
        locations: [
          { locationName: 'Porompat', pincodes: ['795005'], tier: 3 },
          { locationName: 'Sawombung', pincodes: ['795010'], tier: 3 },
        ],
      },
      {
        districtName: 'Churachandpur',
        locations: [
          { locationName: 'Churachandpur Town', pincodes: ['795128'], tier: 3 },
        ],
      },
      {
        districtName: 'Thoubal',
        locations: [
          { locationName: 'Thoubal Town', pincodes: ['795138'], tier: 3 },
          { locationName: 'Kakching', pincodes: ['795103'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Meghalaya',
    code: 'ML',
    type: 'STATE',
    districts: [
      {
        districtName: 'East Khasi Hills',
        locations: [
          { locationName: 'Shillong Police Bazar / GPO', pincodes: ['793001'], tier: 2 },
          { locationName: 'Shillong Laitumkhrah', pincodes: ['793003'], tier: 2 },
          { locationName: 'Sohra (Cherrapunji)', pincodes: ['793108'], tier: 3 },
        ],
      },
      {
        districtName: 'West Garo Hills',
        locations: [
          { locationName: 'Tura Town', pincodes: ['794001'], tier: 3 },
        ],
      },
      {
        districtName: 'Ri-Bhoi',
        locations: [
          { locationName: 'Nongpoh', pincodes: ['793102'], tier: 3 },
          { locationName: 'Byrnihat Industrial Area', pincodes: ['793101'], tier: 2 },
        ],
      },
    ],
  },
  {
    stateName: 'Mizoram',
    code: 'MZ',
    type: 'STATE',
    districts: [
      {
        districtName: 'Aizawl',
        locations: [
          { locationName: 'Aizawl City / Khatla', pincodes: ['796001'], tier: 2 },
          { locationName: 'Bawngkawn', pincodes: ['796014'], tier: 3 },
          { locationName: 'Durtlang', pincodes: ['796025'], tier: 3 },
        ],
      },
      {
        districtName: 'Lunglei',
        locations: [
          { locationName: 'Lunglei Town', pincodes: ['796701'], tier: 3 },
        ],
      },
      {
        districtName: 'Champhai',
        locations: [
          { locationName: 'Champhai Town', pincodes: ['796321'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Nagaland',
    code: 'NL',
    type: 'STATE',
    districts: [
      {
        districtName: 'Dimapur',
        locations: [
          { locationName: 'Dimapur City', pincodes: ['797112'], tier: 2 },
          { locationName: 'Chumoukedima', pincodes: ['797103'], tier: 2 },
        ],
      },
      {
        districtName: 'Kohima',
        locations: [
          { locationName: 'Kohima Town', pincodes: ['797001'], tier: 2 },
          { locationName: 'Tseminyu', pincodes: ['797109'], tier: 3 },
        ],
      },
      {
        districtName: 'Mokokchung',
        locations: [
          { locationName: 'Mokokchung Town', pincodes: ['798601'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Odisha',
    code: 'OD',
    type: 'STATE',
    districts: [
      {
        districtName: 'Khordha',
        locations: [
          { locationName: 'Bhubaneswar Saheed Nagar / Master Canteen', pincodes: ['751001', '751007'], tier: 1 },
          { locationName: 'Bhubaneswar Jayadev Vihar / Patia / Infocity', pincodes: ['751013', '751024'], tier: 1 },
          { locationName: 'Bhubaneswar Khandagiri', pincodes: ['751030'], tier: 1 },
          { locationName: 'Khordha Town', pincodes: ['752055'], tier: 2 },
        ],
      },
      {
        districtName: 'Cuttack',
        locations: [
          { locationName: 'Cuttack City', pincodes: ['753001', '753002', '753003'], tier: 2 },
          { locationName: 'Choudwar', pincodes: ['754025'], tier: 3 },
        ],
      },
      {
        districtName: 'Puri',
        locations: [
          { locationName: 'Puri City', pincodes: ['752001', '752002'], tier: 2 },
          { locationName: 'Konark', pincodes: ['752111'], tier: 3 },
        ],
      },
      {
        districtName: 'Sundargarh',
        locations: [
          { locationName: 'Rourkela Steel City', pincodes: ['769001', '769004', '769012'], tier: 2 },
          { locationName: 'Sundargarh Town', pincodes: ['770001'], tier: 3 },
        ],
      },
      {
        districtName: 'Ganjam',
        locations: [
          { locationName: 'Berhampur City', pincodes: ['760001', '760002'], tier: 2 },
          { locationName: 'Chhatrapur', pincodes: ['761020'], tier: 3 },
        ],
      },
      {
        districtName: 'Sambalpur',
        locations: [
          { locationName: 'Sambalpur City', pincodes: ['768001'], tier: 2 },
          { locationName: 'Burla', pincodes: ['768017'], tier: 3 },
        ],
      },
      {
        districtName: 'Balasore',
        locations: [
          { locationName: 'Balasore Town', pincodes: ['756001'], tier: 2 },
          { locationName: 'Jaleswar', pincodes: ['756032'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Puducherry',
    code: 'PY',
    type: 'UT',
    districts: [
      {
        districtName: 'Puducherry',
        locations: [
          { locationName: 'Pondicherry White Town / Promenade', pincodes: ['605001'], tier: 2 },
          { locationName: 'Oulgaret', pincodes: ['605009'], tier: 2 },
          { locationName: 'Auroville area', pincodes: ['605101'], tier: 2 },
          { locationName: 'Villianur', pincodes: ['605110'], tier: 3 },
        ],
      },
      {
        districtName: 'Karaikal',
        locations: [
          { locationName: 'Karaikal Town', pincodes: ['609602'], tier: 3 },
        ],
      },
      {
        districtName: 'Mahe',
        locations: [
          { locationName: 'Mahe Town', pincodes: ['673310'], tier: 3 },
        ],
      },
      {
        districtName: 'Yanam',
        locations: [
          { locationName: 'Yanam Town', pincodes: ['533464'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Punjab',
    code: 'PB',
    type: 'STATE',
    districts: [
      {
        districtName: 'Ludhiana',
        locations: [
          { locationName: 'Ludhiana Civil Lines / Mall Rd', pincodes: ['141001'], tier: 1 },
          { locationName: 'Ludhiana Model Town / Sarabha Nagar', pincodes: ['141002'], tier: 1 },
          { locationName: 'Ludhiana Focal Point Industrial', pincodes: ['141010'], tier: 1 },
          { locationName: 'Khanna', pincodes: ['141401'], tier: 2 },
          { locationName: 'Jagraon', pincodes: ['142026'], tier: 3 },
        ],
      },
      {
        districtName: 'Amritsar',
        locations: [
          { locationName: 'Amritsar Golden Temple / Hall Bazar', pincodes: ['143001', '143006'], tier: 2 },
          { locationName: 'Amritsar Ranjit Avenue / Lawrence Rd', pincodes: ['143001'], tier: 2 },
          { locationName: 'Attari', pincodes: ['143108'], tier: 3 },
        ],
      },
      {
        districtName: 'Jalandhar',
        locations: [
          { locationName: 'Jalandhar City / Model Town', pincodes: ['144001', '144003'], tier: 2 },
          { locationName: 'Jalandhar Cantt', pincodes: ['144005'], tier: 2 },
          { locationName: 'Phagwara', pincodes: ['144401'], tier: 2 },
        ],
      },
      {
        districtName: 'SAS Nagar (Mohali)',
        locations: [
          { locationName: 'Mohali Phase 1 to 11', pincodes: ['160055', '160059', '160062'], tier: 1 },
          { locationName: 'Kharar', pincodes: ['140301'], tier: 2 },
          { locationName: 'Zirakpur', pincodes: ['140603'], tier: 1 },
          { locationName: 'Dera Bassi', pincodes: ['140507'], tier: 2 },
        ],
      },
      {
        districtName: 'Patiala',
        locations: [
          { locationName: 'Patiala City', pincodes: ['147001'], tier: 2 },
          { locationName: 'Rajpura', pincodes: ['140401'], tier: 2 },
          { locationName: 'Nabha', pincodes: ['147201'], tier: 3 },
        ],
      },
      {
        districtName: 'Bathinda',
        locations: [
          { locationName: 'Bathinda City', pincodes: ['151001'], tier: 2 },
          { locationName: 'Rampura Phul', pincodes: ['151103'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Rajasthan',
    code: 'RJ',
    type: 'STATE',
    districts: [
      {
        districtName: 'Ajmer',
        locations: [
          { locationName: 'Ajmer City / Civil Lines', pincodes: ['305001'], tier: 2 },
          { locationName: 'Kishangarh (Marble City)', pincodes: ['305801', '305802'], tier: 2 },
          { locationName: 'Beawar', pincodes: ['305901'], tier: 2 },
          { locationName: 'Pushkar', pincodes: ['305022'], tier: 3 },
        ],
      },
      {
        districtName: 'Alwar',
        locations: [
          { locationName: 'Alwar City', pincodes: ['301001'], tier: 2 },
          { locationName: 'Bhiwadi Industrial Area', pincodes: ['301019'], tier: 1 },
          { locationName: 'Neemrana Japanese Zone', pincodes: ['301705'], tier: 2 },
          { locationName: 'Tijara', pincodes: ['301411'], tier: 3 },
          { locationName: 'Behror', pincodes: ['301701'], tier: 3 },
        ],
      },
      {
        districtName: 'Banswara',
        locations: [
          { locationName: 'Banswara Town', pincodes: ['327001'], tier: 3 },
          { locationName: 'Kushalgarh', pincodes: ['327801'], tier: 3 },
        ],
      },
      {
        districtName: 'Baran',
        locations: [
          { locationName: 'Baran Town', pincodes: ['325205'], tier: 3 },
          { locationName: 'Chhabra', pincodes: ['325220'], tier: 3 },
        ],
      },
      {
        districtName: 'Barmer',
        locations: [
          { locationName: 'Barmer City', pincodes: ['344001'], tier: 2 },
          { locationName: 'Balotra', pincodes: ['344022'], tier: 2 },
        ],
      },
      {
        districtName: 'Bharatpur',
        locations: [
          { locationName: 'Bharatpur City', pincodes: ['321001'], tier: 2 },
          { locationName: 'Deeg', pincodes: ['321203'], tier: 3 },
          { locationName: 'Bayana', pincodes: ['321401'], tier: 3 },
        ],
      },
      {
        districtName: 'Bhilwara',
        locations: [
          { locationName: 'Bhilwara City (Textile Hub)', pincodes: ['311001'], tier: 2 },
          { locationName: 'Shahpura', pincodes: ['311404'], tier: 3 },
          { locationName: 'Mandalgarh', pincodes: ['311604'], tier: 3 },
        ],
      },
      {
        districtName: 'Bikaner',
        locations: [
          { locationName: 'Bikaner City / KEM Road', pincodes: ['334001'], tier: 2 },
          { locationName: 'Gangashahar / Nokha', pincodes: ['334401', '334803'], tier: 3 },
        ],
      },
      {
        districtName: 'Bundi',
        locations: [
          { locationName: 'Bundi Town', pincodes: ['323001'], tier: 3 },
          { locationName: 'Keshoraipatan', pincodes: ['323601'], tier: 3 },
        ],
      },
      {
        districtName: 'Chittorgarh',
        locations: [
          { locationName: 'Chittorgarh City', pincodes: ['312001'], tier: 2 },
          { locationName: 'Nimbahera', pincodes: ['312601'], tier: 3 },
        ],
      },
      {
        districtName: 'Churu',
        locations: [
          { locationName: 'Churu Town', pincodes: ['331001'], tier: 3 },
          { locationName: 'Sujangarh', pincodes: ['331507'], tier: 3 },
          { locationName: 'Ratangarh', pincodes: ['331022'], tier: 3 },
        ],
      },
      {
        districtName: 'Dausa',
        locations: [
          { locationName: 'Dausa Town', pincodes: ['303303'], tier: 3 },
          { locationName: 'Bandikui', pincodes: ['303313'], tier: 3 },
        ],
      },
      {
        districtName: 'Dholpur',
        locations: [
          { locationName: 'Dholpur Town', pincodes: ['328001'], tier: 3 },
          { locationName: 'Bari', pincodes: ['328021'], tier: 3 },
        ],
      },
      {
        districtName: 'Dungarpur',
        locations: [
          { locationName: 'Dungarpur Town', pincodes: ['314001'], tier: 3 },
          { locationName: 'Sagwara', pincodes: ['314025'], tier: 3 },
        ],
      },
      {
        districtName: 'Hanumangarh',
        locations: [
          { locationName: 'Hanumangarh Town', pincodes: ['335513'], tier: 2 },
          { locationName: 'Hanumangarh Junction', pincodes: ['335512'], tier: 2 },
          { locationName: 'Nohar', pincodes: ['335523'], tier: 3 },
        ],
      },
      {
        districtName: 'Jaipur',
        locations: [
          { locationName: 'Jaipur MI Road & C-Scheme', pincodes: ['302001'], tier: 1 },
          { locationName: 'Jaipur Mansarovar', pincodes: ['302020'], tier: 1 },
          { locationName: 'Jaipur Malviya Nagar & Jagatpura', pincodes: ['302017'], tier: 1 },
          { locationName: 'Jaipur Vaishali Nagar', pincodes: ['302021'], tier: 1 },
          { locationName: 'Jaipur Raja Park & Adarsh Nagar', pincodes: ['302004'], tier: 1 },
          { locationName: 'Jaipur Sitapura Industrial Area', pincodes: ['302022'], tier: 1 },
          { locationName: 'Sanganer', pincodes: ['302029'], tier: 1 },
          { locationName: 'Chomu', pincodes: ['303702'], tier: 2 },
        ],
      },
      {
        districtName: 'Jaisalmer',
        locations: [
          { locationName: 'Jaisalmer City', pincodes: ['345001'], tier: 2 },
          { locationName: 'Pokaran', pincodes: ['345021'], tier: 3 },
        ],
      },
      {
        districtName: 'Jalore',
        locations: [
          { locationName: 'Jalore Town', pincodes: ['343001'], tier: 3 },
          { locationName: 'Bhinmal', pincodes: ['343029'], tier: 3 },
          { locationName: 'Sanchore', pincodes: ['343041'], tier: 3 },
        ],
      },
      {
        districtName: 'Jhalawar',
        locations: [
          { locationName: 'Jhalawar City', pincodes: ['326001'], tier: 3 },
          { locationName: 'Jhalrapatan', pincodes: ['326023'], tier: 3 },
          { locationName: 'Bhawani Mandi', pincodes: ['326502'], tier: 3 },
        ],
      },
      {
        districtName: 'Jhunjhunu',
        locations: [
          { locationName: 'Jhunjhunu City', pincodes: ['333001'], tier: 2 },
          { locationName: 'Nawalgarh', pincodes: ['333042'], tier: 3 },
          { locationName: 'Pilani (BITS Pilani)', pincodes: ['333031'], tier: 2 },
          { locationName: 'Chirawa', pincodes: ['333026'], tier: 3 },
        ],
      },
      {
        districtName: 'Jodhpur',
        locations: [
          { locationName: 'Jodhpur City / Clock Tower', pincodes: ['342001'], tier: 1 },
          { locationName: 'Jodhpur Shastri Nagar / Sardarpura', pincodes: ['342003'], tier: 1 },
          { locationName: 'Jodhpur Ratanada / Airport Road', pincodes: ['342011'], tier: 1 },
          { locationName: 'Phalodi', pincodes: ['342301'], tier: 3 },
          { locationName: 'Piparcity', pincodes: ['342601'], tier: 3 },
        ],
      },
      {
        districtName: 'Karauli',
        locations: [
          { locationName: 'Karauli Town', pincodes: ['322241'], tier: 3 },
          { locationName: 'Hindaun City', pincodes: ['322230'], tier: 2 },
        ],
      },
      {
        districtName: 'Kota',
        locations: [
          { locationName: 'Kota Coaching Hub / Vigyan Nagar / Talwandi', pincodes: ['324005'], tier: 1 },
          { locationName: 'Kota Dadabari / Mahaveer Nagar', pincodes: ['324009'], tier: 1 },
          { locationName: 'Kota Gumanpura / Nayapura', pincodes: ['324001', '324007'], tier: 1 },
          { locationName: 'Ramganj Mandi', pincodes: ['326519'], tier: 3 },
        ],
      },
      {
        districtName: 'Nagaur',
        locations: [
          { locationName: 'Nagaur Town', pincodes: ['341001'], tier: 2 },
          { locationName: 'Kuchaman City', pincodes: ['341508'], tier: 2 },
          { locationName: 'Makrana (Marble City)', pincodes: ['341505'], tier: 2 },
          { locationName: 'Didwana', pincodes: ['341303'], tier: 3 },
          { locationName: 'Ladnun', pincodes: ['341306'], tier: 3 },
        ],
      },
      {
        districtName: 'Pali',
        locations: [
          { locationName: 'Pali City', pincodes: ['306401'], tier: 2 },
          { locationName: 'Falna / Sumerpur', pincodes: ['306116', '306902'], tier: 2 },
          { locationName: 'Sojat (Henna City)', pincodes: ['306104'], tier: 3 },
        ],
      },
      {
        districtName: 'Pratapgarh',
        locations: [
          { locationName: 'Pratapgarh Town', pincodes: ['312605'], tier: 3 },
          { locationName: 'Chhoti Sadri', pincodes: ['312604'], tier: 3 },
        ],
      },
      {
        districtName: 'Rajsamand',
        locations: [
          { locationName: 'Rajsamand / Rajnagar', pincodes: ['313324'], tier: 2 },
          { locationName: 'Nathdwara (Shreenathji)', pincodes: ['313301'], tier: 2 },
          { locationName: 'Amet', pincodes: ['313332'], tier: 3 },
        ],
      },
      {
        districtName: 'Sawai Madhopur',
        locations: [
          { locationName: 'Sawai Madhopur / Ranthambore', pincodes: ['322001', '322021'], tier: 2 },
          { locationName: 'Gangapur City', pincodes: ['322201'], tier: 2 },
        ],
      },
      {
        districtName: 'Sikar',
        locations: [
          { locationName: 'Sikar Coaching Hub / City', pincodes: ['332001'], tier: 2 },
          { locationName: 'Fatehpur Shekhawati', pincodes: ['332301'], tier: 3 },
          { locationName: 'Neem Ka Thana', pincodes: ['332713'], tier: 2 },
          { locationName: 'Sri Madhopur', pincodes: ['332715'], tier: 3 },
          { locationName: 'Khatu Shyamji', pincodes: ['332602'], tier: 2 },
        ],
      },
      {
        districtName: 'Sirohi',
        locations: [
          { locationName: 'Sirohi Town', pincodes: ['307001'], tier: 3 },
          { locationName: 'Mount Abu (Hill Station)', pincodes: ['307501'], tier: 2 },
          { locationName: 'Abu Road Industrial Area', pincodes: ['307026'], tier: 2 },
        ],
      },
      {
        districtName: 'Sri Ganganagar',
        locations: [
          { locationName: 'Sri Ganganagar City', pincodes: ['335001'], tier: 2 },
          { locationName: 'Suratgarh', pincodes: ['335804'], tier: 3 },
          { locationName: 'Raisinghnagar', pincodes: ['335051'], tier: 3 },
        ],
      },
      {
        districtName: 'Tonk',
        locations: [
          { locationName: 'Tonk Town', pincodes: ['304001'], tier: 3 },
          { locationName: 'Deoli', pincodes: ['304804'], tier: 3 },
          { locationName: 'Malpura', pincodes: ['304502'], tier: 3 },
        ],
      },
      {
        districtName: 'Udaipur',
        locations: [
          { locationName: 'Udaipur City / Lake City', pincodes: ['313001'], tier: 1 },
          { locationName: 'Udaipur Hiran Magri / Sukher', pincodes: ['313002', '313004'], tier: 1 },
          { locationName: 'Fatehnagar', pincodes: ['313205'], tier: 3 },
          { locationName: 'Salumbar', pincodes: ['313106'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Sikkim',
    code: 'SK',
    type: 'STATE',
    districts: [
      {
        districtName: 'East Sikkim (Gangtok)',
        locations: [
          { locationName: 'Gangtok MG Marg & GPO', pincodes: ['737101'], tier: 2 },
          { locationName: 'Ranipool', pincodes: ['737135'], tier: 3 },
          { locationName: 'Singtam', pincodes: ['737134'], tier: 3 },
        ],
      },
      {
        districtName: 'South Sikkim',
        locations: [
          { locationName: 'Namchi', pincodes: ['737126'], tier: 3 },
          { locationName: 'Jorethang', pincodes: ['737121'], tier: 3 },
        ],
      },
      {
        districtName: 'West Sikkim',
        locations: [
          { locationName: 'Gyalshing (Geyzing)', pincodes: ['737111'], tier: 3 },
          { locationName: 'Pelling', pincodes: ['737113'], tier: 3 },
        ],
      },
      {
        districtName: 'North Sikkim',
        locations: [
          { locationName: 'Mangan', pincodes: ['737116'], tier: 3 },
          { locationName: 'Chungthang', pincodes: ['737120'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Tamil Nadu',
    code: 'TN',
    type: 'STATE',
    districts: [
      {
        districtName: 'Chennai',
        locations: [
          { locationName: 'Chennai T Nagar / Nungambakkam', pincodes: ['600017', '600034'], tier: 1 },
          { locationName: 'Chennai OMR / Sholinganallur / Perungudi', pincodes: ['600096', '600119'], tier: 1 },
          { locationName: 'Chennai Anna Nagar / Kilpauk', pincodes: ['600010', '600040'], tier: 1 },
          { locationName: 'Chennai Adyar / Velachery', pincodes: ['600020', '600042'], tier: 1 },
          { locationName: 'Chennai Parrys / George Town', pincodes: ['600001'], tier: 1 },
        ],
      },
      {
        districtName: 'Coimbatore',
        locations: [
          { locationName: 'Coimbatore RS Puram / Gandhipuram', pincodes: ['641002', '641012'], tier: 1 },
          { locationName: 'Coimbatore Peelamedu / Avinashi Rd', pincodes: ['641004'], tier: 1 },
          { locationName: 'Pollachi', pincodes: ['642001'], tier: 2 },
        ],
      },
      {
        districtName: 'Madurai',
        locations: [
          { locationName: 'Madurai City / Meenakshi Temple area', pincodes: ['625001'], tier: 2 },
          { locationName: 'Madurai KK Nagar / Anna Nagar', pincodes: ['625020'], tier: 2 },
          { locationName: 'Melur', pincodes: ['625106'], tier: 3 },
        ],
      },
      {
        districtName: 'Tiruchirappalli',
        locations: [
          { locationName: 'Trichy Cantt & Thillai Nagar', pincodes: ['620001', '620018'], tier: 2 },
          { locationName: 'Srirangam', pincodes: ['620006'], tier: 2 },
        ],
      },
      {
        districtName: 'Salem',
        locations: [
          { locationName: 'Salem City', pincodes: ['636001', '636007'], tier: 2 },
          { locationName: 'Attur', pincodes: ['636102'], tier: 3 },
          { locationName: 'Mettur', pincodes: ['636401'], tier: 3 },
        ],
      },
      {
        districtName: 'Tiruppur',
        locations: [
          { locationName: 'Tiruppur Knitwear City', pincodes: ['641601', '641602'], tier: 1 },
          { locationName: 'Dharapuram', pincodes: ['638656'], tier: 3 },
          { locationName: 'Udumalaipettai', pincodes: ['642126'], tier: 3 },
        ],
      },
      {
        districtName: 'Erode',
        locations: [
          { locationName: 'Erode Town', pincodes: ['638001'], tier: 2 },
          { locationName: 'Perundurai', pincodes: ['638052'], tier: 3 },
          { locationName: 'Gobichettipalayam', pincodes: ['638452'], tier: 3 },
        ],
      },
      {
        districtName: 'Kanchipuram',
        locations: [
          { locationName: 'Kanchipuram Silk City', pincodes: ['631501'], tier: 2 },
          { locationName: 'Sriperumbudur Industrial Hub', pincodes: ['602105'], tier: 1 },
        ],
      },
      {
        districtName: 'Chengalpattu',
        locations: [
          { locationName: 'Chengalpattu Town', pincodes: ['603001'], tier: 2 },
          { locationName: 'Tambaram / Chromepet', pincodes: ['600044', '600045'], tier: 1 },
          { locationName: 'Mahabalipuram', pincodes: ['603104'], tier: 2 },
        ],
      },
      {
        districtName: 'Tirunelveli',
        locations: [
          { locationName: 'Tirunelveli Town & Junction', pincodes: ['627001', '627006'], tier: 2 },
          { locationName: 'Palayamkottai', pincodes: ['627002'], tier: 2 },
        ],
      },
      {
        districtName: 'Vellore',
        locations: [
          { locationName: 'Vellore City / CMC / Katpadi', pincodes: ['632004', '632007'], tier: 2 },
        ],
      },
    ],
  },
  {
    stateName: 'Telangana',
    code: 'TS',
    type: 'STATE',
    districts: [
      {
        districtName: 'Hyderabad',
        locations: [
          { locationName: 'Hyderabad Banjara Hills & Jubilee Hills', pincodes: ['500033', '500034'], tier: 1 },
          { locationName: 'Hyderabad Hitec City / Gachibowli / Madhapur', pincodes: ['500081', '500032'], tier: 1 },
          { locationName: 'Hyderabad Secunderabad / Begumpet', pincodes: ['500003', '500016'], tier: 1 },
          { locationName: 'Hyderabad Abids / Koti / Charminar', pincodes: ['500001', '500002'], tier: 1 },
          { locationName: 'Hyderabad Kukatpally / KPHB', pincodes: ['500072'], tier: 1 },
        ],
      },
      {
        districtName: 'Medchal-Malkajgiri',
        locations: [
          { locationName: 'Malkajgiri / Alwal', pincodes: ['500010', '500047'], tier: 1 },
          { locationName: 'Kompally / Medchal', pincodes: ['500100', '501401'], tier: 1 },
          { locationName: 'Uppal', pincodes: ['500039'], tier: 1 },
        ],
      },
      {
        districtName: 'Rangareddy',
        locations: [
          { locationName: 'Shamshabad (Airport Area)', pincodes: ['501218'], tier: 1 },
          { locationName: 'Manikonda / Narsingi', pincodes: ['500089', '500075'], tier: 1 },
          { locationName: 'LB Nagar / Vanasthalipuram', pincodes: ['500074', '500070'], tier: 1 },
        ],
      },
      {
        districtName: 'Warangal (Urban & Rural)',
        locations: [
          { locationName: 'Warangal City', pincodes: ['506001', '506002'], tier: 2 },
          { locationName: 'Hanamkonda', pincodes: ['506001'], tier: 2 },
          { locationName: 'Kazipet', pincodes: ['506003'], tier: 2 },
        ],
      },
      {
        districtName: 'Karimnagar',
        locations: [
          { locationName: 'Karimnagar City', pincodes: ['505001'], tier: 2 },
          { locationName: 'Huzurabad', pincodes: ['505468'], tier: 3 },
        ],
      },
      {
        districtName: 'Nizamabad',
        locations: [
          { locationName: 'Nizamabad City', pincodes: ['503001', '503002'], tier: 2 },
          { locationName: 'Bodhan', pincodes: ['503185'], tier: 3 },
          { locationName: 'Armoor', pincodes: ['503224'], tier: 3 },
        ],
      },
      {
        districtName: 'Khammam',
        locations: [
          { locationName: 'Khammam City', pincodes: ['507001', '507002'], tier: 2 },
          { locationName: 'Madhira', pincodes: ['507203'], tier: 3 },
        ],
      },
    ],
  },
  {
    stateName: 'Tripura',
    code: 'TR',
    type: 'STATE',
    districts: [
      {
        districtName: 'West Tripura (Agartala)',
        locations: [
          { locationName: 'Agartala City / Post Office Chowmuhani', pincodes: ['799001'], tier: 2 },
          { locationName: 'Kunjaban', pincodes: ['799006'], tier: 2 },
          { locationName: 'Badharghat', pincodes: ['799003'], tier: 3 },
        ],
      },
      {
        districtName: 'Gomati',
        locations: [
          { locationName: 'Udaipur Town (Tripura Sundari)', pincodes: ['799120'], tier: 3 },
          { locationName: 'Amarpur', pincodes: ['799101'], tier: 3 },
        ],
      },
      {
        districtName: 'North Tripura',
        locations: [
          { locationName: 'Dharmanagar', pincodes: ['799250'], tier: 3 },
          { locationName: 'Kanchanpur', pincodes: ['799270'], tier: 3 },
        ],
      },
      {
        districtName: 'Dhalai',
        locations: [
          { locationName: 'Ambassa', pincodes: ['799289'], tier: 3 },
          { locationName: 'Kamalpur', pincodes: ['799285'], tier: 3 },
        ],
      },
    ],
  },
  {
    // =========================================================================
    // UTTAR PRADESH - ALL 75 DISTRICTS COMPLETE & SOURCED FROM LGD / INDIA POST
    // =========================================================================
    stateName: 'Uttar Pradesh',
    code: 'UP',
    type: 'STATE',
    districts: [
      {
        districtName: 'Agra',
        locations: [
          { locationName: 'Agra Cantt & Sadar Bazar', pincodes: ['282001'], tier: 1 },
          { locationName: 'Agra Sanjay Place / Civil Lines', pincodes: ['282002'], tier: 1 },
          { locationName: 'Dayalbagh', pincodes: ['282005'], tier: 1 },
          { locationName: 'Kamla Nagar', pincodes: ['282005'], tier: 1 },
          { locationName: 'Fatehpur Sikri', pincodes: ['283102'], tier: 2 },
          { locationName: 'Kheragarh', pincodes: ['283121'], tier: 3 },
        ],
      },
      {
        districtName: 'Aligarh',
        locations: [
          { locationName: 'Aligarh City / Civil Lines', pincodes: ['202001', '202002'], tier: 2 },
          { locationName: 'Atrauli', pincodes: ['202280'], tier: 3 },
          { locationName: 'Khair', pincodes: ['202138'], tier: 3 },
          { locationName: 'Iglas', pincodes: ['202124'], tier: 3 },
        ],
      },
      {
        districtName: 'Ambedkar Nagar',
        locations: [
          { locationName: 'Akbarpur', pincodes: ['224122'], tier: 3 },
          { locationName: 'Tanda', pincodes: ['224190'], tier: 3 },
          { locationName: 'Jalalpur', pincodes: ['224149'], tier: 3 },
        ],
      },
      {
        districtName: 'Amethi',
        locations: [
          { locationName: 'Gauriganj (HQ)', pincodes: ['227409'], tier: 3 },
          { locationName: 'Amethi Town', pincodes: ['227405'], tier: 3 },
          { locationName: 'Musafirkhana', pincodes: ['227813'], tier: 3 },
          { locationName: 'Tiloi', pincodes: ['229309'], tier: 3 },
        ],
      },
      {
        districtName: 'Amroha (Jyotiba Phule Nagar)',
        locations: [
          { locationName: 'Amroha Town', pincodes: ['244221'], tier: 2 },
          { locationName: 'Gajraula Industrial Area', pincodes: ['244235'], tier: 2 },
          { locationName: 'Hasanpur', pincodes: ['244241'], tier: 3 },
          { locationName: 'Dhanaura', pincodes: ['244231'], tier: 3 },
        ],
      },
      {
        districtName: 'Auraiya',
        locations: [
          { locationName: 'Auraiya Town', pincodes: ['206122'], tier: 3 },
          { locationName: 'Bidhuna', pincodes: ['206243'], tier: 3 },
          { locationName: 'Dibiyapur (NTPC Area)', pincodes: ['206244'], tier: 2 },
        ],
      },
      {
        districtName: 'Ayodhya (Faizabad)',
        locations: [
          { locationName: 'Ayodhya Dham / Temple Area', pincodes: ['224123'], tier: 1 },
          { locationName: 'Faizabad City / Civil Lines', pincodes: ['224001'], tier: 1 },
          { locationName: 'Rudauli', pincodes: ['224120'], tier: 3 },
          { locationName: 'Bikapur', pincodes: ['224203'], tier: 3 },
        ],
      },
      {
        districtName: 'Azamgarh',
        locations: [
          { locationName: 'Azamgarh City', pincodes: ['276001'], tier: 2 },
          { locationName: 'Mubarakpur (Weavers Hub)', pincodes: ['276404'], tier: 3 },
          { locationName: 'Sagri', pincodes: ['276138'], tier: 3 },
          { locationName: 'Lalganj', pincodes: ['276302'], tier: 3 },
        ],
      },
      {
        districtName: 'Baghpat',
        locations: [
          { locationName: 'Baghpat Town', pincodes: ['250609'], tier: 2 },
          { locationName: 'Baraut', pincodes: ['250611'], tier: 2 },
          { locationName: 'Khekra', pincodes: ['250101'], tier: 2 },
        ],
      },
      {
        districtName: 'Bahraich',
        locations: [
          { locationName: 'Bahraich City', pincodes: ['271801'], tier: 2 },
          { locationName: 'Nanpara', pincodes: ['271865'], tier: 3 },
          { locationName: 'Kaiserganj', pincodes: ['271903'], tier: 3 },
        ],
      },
      {
        districtName: 'Ballia',
        locations: [
          { locationName: 'Ballia City', pincodes: ['277001'], tier: 2 },
          { locationName: 'Rasra', pincodes: ['277123'], tier: 3 },
          { locationName: 'Bansdih', pincodes: ['277202'], tier: 3 },
          { locationName: 'Bairia', pincodes: ['277201'], tier: 3 },
        ],
      },
      {
        districtName: 'Balrampur',
        locations: [
          { locationName: 'Balrampur Town', pincodes: ['271201'], tier: 3 },
          { locationName: 'Tulsipur', pincodes: ['271208'], tier: 3 },
          { locationName: 'Utraula', pincodes: ['271604'], tier: 3 },
        ],
      },
      {
        districtName: 'Banda',
        locations: [
          { locationName: 'Banda City', pincodes: ['210001'], tier: 2 },
          { locationName: 'Atarra', pincodes: ['210201'], tier: 3 },
          { locationName: 'Naraini', pincodes: ['210128'], tier: 3 },
          { locationName: 'Baberu', pincodes: ['210121'], tier: 3 },
        ],
      },
      {
        districtName: 'Barabanki',
        locations: [
          { locationName: 'Barabanki City', pincodes: ['225001'], tier: 2 },
          { locationName: 'Nawabganj', pincodes: ['225001'], tier: 2 },
          { locationName: 'Fatehpur', pincodes: ['225305'], tier: 3 },
          { locationName: 'Ram Sanehi Ghat', pincodes: ['225409'], tier: 3 },
          { locationName: 'Haidergarh', pincodes: ['225126'], tier: 3 },
        ],
      },
      {
        districtName: 'Bareilly',
        locations: [
          { locationName: 'Bareilly Civil Lines & GPO', pincodes: ['243001'], tier: 1 },
          { locationName: 'Bareilly Cantt / Subhash Nagar', pincodes: ['243002'], tier: 1 },
          { locationName: 'Bareilly Rajendra Nagar / Izzatnagar', pincodes: ['243122'], tier: 1 },
          { locationName: 'Aonla', pincodes: ['243301'], tier: 3 },
          { locationName: 'Baheri', pincodes: ['243201'], tier: 3 },
          { locationName: 'Faridpur', pincodes: ['243503'], tier: 3 },
        ],
      },
      {
        districtName: 'Basti',
        locations: [
          { locationName: 'Basti City', pincodes: ['272001', '272002'], tier: 2 },
          { locationName: 'Harraiya', pincodes: ['272155'], tier: 3 },
          { locationName: 'Rudhauli', pincodes: ['272151'], tier: 3 },
        ],
      },
      {
        districtName: 'Bhadohi (Sant Ravidas Nagar)',
        locations: [
          { locationName: 'Bhadohi Carpet City', pincodes: ['221401'], tier: 2 },
          { locationName: 'Gyanpur (HQ)', pincodes: ['221304'], tier: 3 },
          { locationName: 'Aurai', pincodes: ['221301'], tier: 3 },
        ],
      },
      {
        districtName: 'Bijnor',
        locations: [
          { locationName: 'Bijnor City', pincodes: ['246701'], tier: 2 },
          { locationName: 'Najibabad', pincodes: ['246763'], tier: 2 },
          { locationName: 'Dhampur', pincodes: ['246761'], tier: 2 },
          { locationName: 'Chandpur', pincodes: ['246725'], tier: 3 },
          { locationName: 'Nagina', pincodes: ['246762'], tier: 3 },
        ],
      },
      {
        districtName: 'Budaun',
        locations: [
          { locationName: 'Budaun City', pincodes: ['243601'], tier: 2 },
          { locationName: 'Ujhani', pincodes: ['243639'], tier: 3 },
          { locationName: 'Bilsi', pincodes: ['243633'], tier: 3 },
          { locationName: 'Sahaswan', pincodes: ['243638'], tier: 3 },
        ],
      },
      {
        districtName: 'Bulandshahr',
        locations: [
          { locationName: 'Bulandshahr City', pincodes: ['203001'], tier: 2 },
          { locationName: 'Khurja (Ceramics Hub)', pincodes: ['203131'], tier: 2 },
          { locationName: 'Sikandrabad Industrial Area', pincodes: ['203205'], tier: 2 },
          { locationName: 'Anupshahr', pincodes: ['203390'], tier: 3 },
          { locationName: 'Siana', pincodes: ['203405'], tier: 3 },
        ],
      },
      {
        districtName: 'Chandauli',
        locations: [
          { locationName: 'Pt. Deen Dayal Upadhyay Nagar (Mughalsarai)', pincodes: ['232101'], tier: 2 },
          { locationName: 'Chandauli Town (HQ)', pincodes: ['232104'], tier: 3 },
          { locationName: 'Chakia', pincodes: ['232103'], tier: 3 },
          { locationName: 'Sakaldiha', pincodes: ['232109'], tier: 3 },
        ],
      },
      {
        districtName: 'Chitrakoot',
        locations: [
          { locationName: 'Karwi (HQ)', pincodes: ['210205'], tier: 2 },
          { locationName: 'Chitrakoot Dham', pincodes: ['210204'], tier: 2 },
          { locationName: 'Manikpur', pincodes: ['210208'], tier: 3 },
          { locationName: 'Mau', pincodes: ['210209'], tier: 3 },
        ],
      },
      {
        districtName: 'Deoria',
        locations: [
          { locationName: 'Deoria City', pincodes: ['274001'], tier: 2 },
          { locationName: 'Salempur', pincodes: ['274509'], tier: 3 },
          { locationName: 'Barhaj', pincodes: ['274601'], tier: 3 },
          { locationName: 'Bhatpar Rani', pincodes: ['274702'], tier: 3 },
        ],
      },
      {
        districtName: 'Etah',
        locations: [
          { locationName: 'Etah City', pincodes: ['207001'], tier: 2 },
          { locationName: 'Aliganj', pincodes: ['207249'], tier: 3 },
          { locationName: 'Jalesar (Brass Bell Hub)', pincodes: ['207302'], tier: 3 },
        ],
      },
      {
        districtName: 'Etawah',
        locations: [
          { locationName: 'Etawah City / Civil Lines', pincodes: ['206001'], tier: 2 },
          { locationName: 'Bharthana', pincodes: ['206242'], tier: 3 },
          { locationName: 'Jaswantnagar', pincodes: ['206245'], tier: 3 },
          { locationName: 'Saifai (Medical University)', pincodes: ['206130'], tier: 2 },
        ],
      },
      {
        districtName: 'Farrukhabad',
        locations: [
          { locationName: 'Fatehgarh Cantt (HQ)', pincodes: ['209601'], tier: 2 },
          { locationName: 'Farrukhabad City', pincodes: ['209625'], tier: 2 },
          { locationName: 'Kaimganj', pincodes: ['209502'], tier: 3 },
        ],
      },
      {
        districtName: 'Fatehpur',
        locations: [
          { locationName: 'Fatehpur City', pincodes: ['212601'], tier: 2 },
          { locationName: 'Bindki', pincodes: ['212635'], tier: 3 },
          { locationName: 'Khaga', pincodes: ['212655'], tier: 3 },
        ],
      },
      {
        districtName: 'Firozabad',
        locations: [
          { locationName: 'Firozabad Glass City', pincodes: ['283203'], tier: 2 },
          { locationName: 'Shikohabad', pincodes: ['283135'], tier: 2 },
          { locationName: 'Tundla Junction', pincodes: ['283204'], tier: 2 },
          { locationName: 'Sirsaganj', pincodes: ['283151'], tier: 3 },
        ],
      },
      {
        districtName: 'Gautam Buddha Nagar (Noida)',
        locations: [
          { locationName: 'Noida Sector 1 to 30', pincodes: ['201301'], tier: 1 },
          { locationName: 'Noida Sector 31 to 62', pincodes: ['201301', '201307'], tier: 1 },
          { locationName: 'Noida Sector 63 to 79', pincodes: ['201307', '201304'], tier: 1 },
          { locationName: 'Noida Sector 80 to 120 (Expressway)', pincodes: ['201304', '201305'], tier: 1 },
          { locationName: 'Noida Sector 121 to 168', pincodes: ['201305', '201306'], tier: 1 },
          { locationName: 'Greater Noida Alpha / Beta / Gamma', pincodes: ['201308', '201310'], tier: 1 },
          { locationName: 'Greater Noida West (Noida Extension)', pincodes: ['201306', '201318'], tier: 1 },
          { locationName: 'Dadri', pincodes: ['203207'], tier: 2 },
          { locationName: 'Jewar (Airport Area)', pincodes: ['203135'], tier: 2 },
          { locationName: 'Dankaur', pincodes: ['203201'], tier: 2 },
        ],
      },
      {
        districtName: 'Ghaziabad',
        locations: [
          { locationName: 'Ghaziabad City / RDC / Raj Nagar', pincodes: ['201001', '201002'], tier: 1 },
          { locationName: 'Indirapuram (All Blocks)', pincodes: ['201014'], tier: 1 },
          { locationName: 'Vaishali / Kaushambi', pincodes: ['201010', '201012'], tier: 1 },
          { locationName: 'Vasundhara', pincodes: ['201012'], tier: 1 },
          { locationName: 'Sahibabad Industrial Area', pincodes: ['201005'], tier: 1 },
          { locationName: 'Raj Nagar Extension', pincodes: ['201017'], tier: 1 },
          { locationName: 'Crossings Republik', pincodes: ['201016'], tier: 1 },
          { locationName: 'Modinagar', pincodes: ['201204'], tier: 2 },
          { locationName: 'Loni', pincodes: ['201102'], tier: 2 },
        ],
      },
      {
        districtName: 'Ghazipur',
        locations: [
          { locationName: 'Ghazipur City', pincodes: ['233001'], tier: 2 },
          { locationName: 'Mohammadabad', pincodes: ['233227'], tier: 3 },
          { locationName: 'Zamania', pincodes: ['232329'], tier: 3 },
          { locationName: 'Saidpur', pincodes: ['233304'], tier: 3 },
        ],
      },
      {
        districtName: 'Gonda',
        locations: [
          { locationName: 'Gonda City', pincodes: ['271001', '271002'], tier: 2 },
          { locationName: 'Colonelganj', pincodes: ['271502'], tier: 3 },
          { locationName: 'Mankapur', pincodes: ['271302'], tier: 3 },
        ],
      },
      {
        districtName: 'Gorakhpur',
        locations: [
          { locationName: 'Gorakhpur Civil Lines & Golghar', pincodes: ['273001'], tier: 1 },
          { locationName: 'Gorakhpur Gorakhnath / Medical College', pincodes: ['273015', '273013'], tier: 1 },
          { locationName: 'Gorakhpur GIDA Industrial Area', pincodes: ['273209'], tier: 1 },
          { locationName: 'Chauri Chaura', pincodes: ['273158'], tier: 2 },
          { locationName: 'Sahjanwa', pincodes: ['273209'], tier: 2 },
          { locationName: 'Bansgaon', pincodes: ['273403'], tier: 3 },
        ],
      },
      {
        districtName: 'Hamirpur',
        locations: [
          { locationName: 'Hamirpur Town', pincodes: ['210301'], tier: 3 },
          { locationName: 'Rath', pincodes: ['210431'], tier: 3 },
          { locationName: 'Maudaha', pincodes: ['210507'], tier: 3 },
        ],
      },
      {
        districtName: 'Hapur (Panchsheel Nagar)',
        locations: [
          { locationName: 'Hapur City', pincodes: ['245101'], tier: 2 },
          { locationName: 'Pilkhuwa (Textile Hub)', pincodes: ['245304'], tier: 2 },
          { locationName: 'Garhmukteshwar', pincodes: ['245205'], tier: 2 },
          { locationName: 'Dhaulana', pincodes: ['245301'], tier: 3 },
        ],
      },
      {
        districtName: 'Hardoi',
        locations: [
          { locationName: 'Hardoi City', pincodes: ['241001'], tier: 2 },
          { locationName: 'Sandila Industrial Area', pincodes: ['241204'], tier: 2 },
          { locationName: 'Shahabad', pincodes: ['241124'], tier: 3 },
          { locationName: 'Bilgram', pincodes: ['241303'], tier: 3 },
        ],
      },
      {
        districtName: 'Hathras (Mahamaya Nagar)',
        locations: [
          { locationName: 'Hathras City (Asafoetida Hub)', pincodes: ['204101'], tier: 2 },
          { locationName: 'Sadabad', pincodes: ['281306'], tier: 3 },
          { locationName: 'Sikandra Rao', pincodes: ['204215'], tier: 3 },
          { locationName: 'Sasni', pincodes: ['204216'], tier: 3 },
        ],
      },
      {
        districtName: 'Jalaun',
        locations: [
          { locationName: 'Orai (HQ)', pincodes: ['285001'], tier: 2 },
          { locationName: 'Jalaun Town', pincodes: ['285123'], tier: 3 },
          { locationName: 'Kalpi', pincodes: ['285204'], tier: 3 },
          { locationName: 'Madhogarh', pincodes: ['285126'], tier: 3 },
        ],
      },
      {
        districtName: 'Jaunpur',
        locations: [
          { locationName: 'Jaunpur City', pincodes: ['222001', '222002'], tier: 2 },
          { locationName: 'Shahganj', pincodes: ['223101'], tier: 3 },
          { locationName: 'Machhlishahr', pincodes: ['222143'], tier: 3 },
          { locationName: 'Badlapur', pincodes: ['222125'], tier: 3 },
        ],
      },
      {
        districtName: 'Jhansi',
        locations: [
          { locationName: 'Jhansi City & Sadar Bazar', pincodes: ['284001'], tier: 1 },
          { locationName: 'Jhansi Cantt / Sipri Bazar', pincodes: ['284001', '284002'], tier: 1 },
          { locationName: 'Babina Cantt', pincodes: ['284401'], tier: 2 },
          { locationName: 'Mauranipur', pincodes: ['284204'], tier: 2 },
          { locationName: 'Moth', pincodes: ['284303'], tier: 3 },
        ],
      },
      {
        districtName: 'Kannauj',
        locations: [
          { locationName: 'Kannauj City (Perfume City)', pincodes: ['209725'], tier: 2 },
          { locationName: 'Chhibramau', pincodes: ['209721'], tier: 3 },
          { locationName: 'Tirwa', pincodes: ['209732'], tier: 3 },
        ],
      },
      {
        districtName: 'Kanpur Dehat (Ramabai Nagar)',
        locations: [
          { locationName: 'Akbarpur (HQ)', pincodes: ['209101'], tier: 2 },
          { locationName: 'Rania Industrial Area', pincodes: ['209304'], tier: 2 },
          { locationName: 'Pukhrayan', pincodes: ['209111'], tier: 3 },
          { locationName: 'Rasoolabad', pincodes: ['209306'], tier: 3 },
        ],
      },
      {
        districtName: 'Kanpur Nagar',
        locations: [
          { locationName: 'Kanpur Civil Lines & Mall Road', pincodes: ['208001'], tier: 1 },
          { locationName: 'Kanpur Swaroop Nagar / Tilak Nagar', pincodes: ['208002'], tier: 1 },
          { locationName: 'Kanpur Kalyanpur / IIT Kanpur', pincodes: ['208016', '208017'], tier: 1 },
          { locationName: 'Kanpur Govind Nagar / Kidwai Nagar', pincodes: ['208006', '208011'], tier: 1 },
          { locationName: 'Kanpur Jajmau (Leather Hub)', pincodes: ['208010'], tier: 1 },
          { locationName: 'Bilhaur', pincodes: ['209202'], tier: 3 },
          { locationName: 'Ghatampur', pincodes: ['209206'], tier: 3 },
        ],
      },
      {
        districtName: 'Kasganj (Kanshiram Nagar)',
        locations: [
          { locationName: 'Kasganj Town', pincodes: ['207123'], tier: 2 },
          { locationName: 'Ganjdundwara', pincodes: ['207242'], tier: 3 },
          { locationName: 'Patiali', pincodes: ['207243'], tier: 3 },
        ],
      },
      {
        districtName: 'Kaushambi',
        locations: [
          { locationName: 'Manjhanpur (HQ)', pincodes: ['212207'], tier: 3 },
          { locationName: 'Sirathu', pincodes: ['212217'], tier: 3 },
          { locationName: 'Chail', pincodes: ['212202'], tier: 3 },
          { locationName: 'Bharwari', pincodes: ['212201'], tier: 3 },
        ],
      },
      {
        districtName: 'Kheri (Lakhimpur Kheri)',
        locations: [
          { locationName: 'Lakhimpur Town', pincodes: ['262701'], tier: 2 },
          { locationName: 'Gola Gokaran Nath', pincodes: ['262802'], tier: 2 },
          { locationName: 'Mohammadi', pincodes: ['262804'], tier: 3 },
          { locationName: 'Palia Kalan (Dudhwa)', pincodes: ['262902'], tier: 3 },
        ],
      },
      {
        districtName: 'Kushinagar (Padrauna)',
        locations: [
          { locationName: 'Padrauna (HQ)', pincodes: ['274304'], tier: 2 },
          { locationName: 'Kushinagar (Buddhist Site)', pincodes: ['274402'], tier: 2 },
          { locationName: 'Hata', pincodes: ['274234'], tier: 3 },
          { locationName: 'Kasya', pincodes: ['274402'], tier: 3 },
        ],
      },
      {
        districtName: 'Lalitpur',
        locations: [
          { locationName: 'Lalitpur Town', pincodes: ['284403'], tier: 2 },
          { locationName: 'Mahroni', pincodes: ['284405'], tier: 3 },
          { locationName: 'Talbehat', pincodes: ['284126'], tier: 3 },
        ],
      },
      {
        districtName: 'Lucknow',
        locations: [
          { locationName: 'Lucknow Hazratganj / Raj Bhavan', pincodes: ['226001'], tier: 1 },
          { locationName: 'Lucknow Gomti Nagar & Ext', pincodes: ['226010'], tier: 1 },
          { locationName: 'Lucknow Indira Nagar', pincodes: ['226016'], tier: 1 },
          { locationName: 'Lucknow Alambagh & Transport Nagar', pincodes: ['226005', '226012'], tier: 1 },
          { locationName: 'Lucknow Mahanagar & Kapoorthala', pincodes: ['226006'], tier: 1 },
          { locationName: 'Lucknow Aminabad & Chowk', pincodes: ['226003', '226018'], tier: 1 },
          { locationName: 'Lucknow Jankipuram & Vikas Nagar', pincodes: ['226021', '226022'], tier: 1 },
          { locationName: 'Lucknow Sushant Golf City (Amar Shaheed Path)', pincodes: ['226030'], tier: 1 },
          { locationName: 'Mohanlalganj', pincodes: ['226301'], tier: 2 },
          { locationName: 'Bakshi Ka Talab', pincodes: ['226201'], tier: 2 },
        ],
      },
      {
        districtName: 'Maharajganj',
        locations: [
          { locationName: 'Maharajganj Town', pincodes: ['273303'], tier: 3 },
          { locationName: 'Nautanwa (Border Hub)', pincodes: ['273164'], tier: 2 },
          { locationName: 'Nichlaul', pincodes: ['273304'], tier: 3 },
        ],
      },
      {
        districtName: 'Mahoba',
        locations: [
          { locationName: 'Mahoba City', pincodes: ['210427'], tier: 3 },
          { locationName: 'Charkhari', pincodes: ['210421'], tier: 3 },
          { locationName: 'Kulpahar', pincodes: ['210426'], tier: 3 },
        ],
      },
      {
        districtName: 'Mainpuri',
        locations: [
          { locationName: 'Mainpuri City', pincodes: ['205001'], tier: 2 },
          { locationName: 'Karhal', pincodes: ['205264'], tier: 3 },
          { locationName: 'Bhogaon', pincodes: ['205262'], tier: 3 },
          { locationName: 'Kishni', pincodes: ['205303'], tier: 3 },
        ],
      },
      {
        districtName: 'Mathura',
        locations: [
          { locationName: 'Mathura City & Cantt', pincodes: ['281001'], tier: 1 },
          { locationName: 'Vrindavan Dham', pincodes: ['281121'], tier: 1 },
          { locationName: 'Govardhan', pincodes: ['281502'], tier: 2 },
          { locationName: 'Barsana / Nandgaon', pincodes: ['281405'], tier: 2 },
          { locationName: 'Kosi Kalan', pincodes: ['281403'], tier: 2 },
        ],
      },
      {
        districtName: 'Mau',
        locations: [
          { locationName: 'Mau City (Textile Hub)', pincodes: ['275101'], tier: 2 },
          { locationName: 'Ghosi', pincodes: ['275304'], tier: 3 },
          { locationName: 'Muhammadabad Gohna', pincodes: ['276403'], tier: 3 },
        ],
      },
      {
        districtName: 'Meerut',
        locations: [
          { locationName: 'Meerut City / Sadar Bazar / Cantt', pincodes: ['250001', '250002'], tier: 1 },
          { locationName: 'Meerut Shastri Nagar / Medical College', pincodes: ['250004'], tier: 1 },
          { locationName: 'Meerut Partapur Industrial Area', pincodes: ['250103'], tier: 1 },
          { locationName: 'Mawana (Sugar Mill)', pincodes: ['250401'], tier: 2 },
          { locationName: 'Sardhana', pincodes: ['250342'], tier: 2 },
        ],
      },
      {
        districtName: 'Mirzapur',
        locations: [
          { locationName: 'Mirzapur City', pincodes: ['231001'], tier: 2 },
          { locationName: 'Vindhyachal (Devi Temple)', pincodes: ['231307'], tier: 2 },
          { locationName: 'Chunar (Pottery Hub)', pincodes: ['231304'], tier: 2 },
        ],
      },
      {
        districtName: 'Moradabad',
        locations: [
          { locationName: 'Moradabad Brass City / Civil Lines', pincodes: ['244001'], tier: 1 },
          { locationName: 'Moradabad MDA Colony / Delhi Road', pincodes: ['244001', '244102'], tier: 1 },
          { locationName: 'Kanth', pincodes: ['244501'], tier: 3 },
          { locationName: 'Bilari', pincodes: ['244921'], tier: 3 },
          { locationName: 'Thakurdwara', pincodes: ['244601'], tier: 3 },
        ],
      },
      {
        districtName: 'Muzaffarnagar',
        locations: [
          { locationName: 'Muzaffarnagar City / Civil Lines', pincodes: ['251001', '251002'], tier: 1 },
          { locationName: 'Khatauli (Sugar Hub)', pincodes: ['251201'], tier: 2 },
          { locationName: 'Budhana', pincodes: ['251309'], tier: 3 },
          { locationName: 'Jansath', pincodes: ['251314'], tier: 3 },
        ],
      },
      {
        districtName: 'Pilibhit',
        locations: [
          { locationName: 'Pilibhit City (Flute City)', pincodes: ['262001'], tier: 2 },
          { locationName: 'Bisalpur', pincodes: ['262201'], tier: 3 },
          { locationName: 'Puranpur', pincodes: ['262122'], tier: 3 },
        ],
      },
      {
        districtName: 'Pratapgarh',
        locations: [
          { locationName: 'Bela Pratapgarh (HQ)', pincodes: ['230001'], tier: 2 },
          { locationName: 'Kunda', pincodes: ['230204'], tier: 3 },
          { locationName: 'Lalganj Ajhara', pincodes: ['230132'], tier: 3 },
          { locationName: 'Patti', pincodes: ['230135'], tier: 3 },
        ],
      },
      {
        districtName: 'Prayagraj (Allahabad)',
        locations: [
          { locationName: 'Prayagraj Civil Lines & High Court', pincodes: ['211001'], tier: 1 },
          { locationName: 'Prayagraj Georgetown & Katra', pincodes: ['211002'], tier: 1 },
          { locationName: 'Prayagraj Naini Industrial Hub', pincodes: ['211008'], tier: 1 },
          { locationName: 'Prayagraj Jhunsi & Phaphamau', pincodes: ['211019', '211013'], tier: 1 },
          { locationName: 'Phulpur (IFFCO Area)', pincodes: ['212402'], tier: 2 },
          { locationName: 'Soraon', pincodes: ['212502'], tier: 3 },
        ],
      },
      {
        districtName: 'Raebareli',
        locations: [
          { locationName: 'Raebareli City / Civil Lines', pincodes: ['229001'], tier: 2 },
          { locationName: 'Lalganj (Modern Coach Factory)', pincodes: ['229206'], tier: 2 },
          { locationName: 'Bachhrawan', pincodes: ['229301'], tier: 3 },
          { locationName: 'Salon', pincodes: ['229127'], tier: 3 },
        ],
      },
      {
        districtName: 'Rampur',
        locations: [
          { locationName: 'Rampur City / Civil Lines', pincodes: ['244901'], tier: 2 },
          { locationName: 'Bilaspur', pincodes: ['244923'], tier: 3 },
          { locationName: 'Milak', pincodes: ['244921'], tier: 3 },
          { locationName: 'Shahabad', pincodes: ['244922'], tier: 3 },
        ],
      },
      {
        districtName: 'Saharanpur',
        locations: [
          { locationName: 'Saharanpur City (Woodcraft Hub)', pincodes: ['247001'], tier: 1 },
          { locationName: 'Deoband (Islamic University)', pincodes: ['247554'], tier: 2 },
          { locationName: 'Nakur', pincodes: ['247342'], tier: 3 },
          { locationName: 'Rampur Maniharan', pincodes: ['247451'], tier: 3 },
          { locationName: 'Behat', pincodes: ['247121'], tier: 3 },
        ],
      },
      {
        districtName: 'Sambhal (Bhim Nagar)',
        locations: [
          { locationName: 'Sambhal Town', pincodes: ['244302'], tier: 2 },
          { locationName: 'Chandausi', pincodes: ['244412'], tier: 2 },
          { locationName: 'Gunnaur', pincodes: ['243722'], tier: 3 },
        ],
      },
      {
        districtName: 'Sant Kabir Nagar',
        locations: [
          { locationName: 'Khalilabad (HQ)', pincodes: ['272175'], tier: 2 },
          { locationName: 'Maghar (Kabir Samadhi)', pincodes: ['272173'], tier: 3 },
          { locationName: 'Mehdawal', pincodes: ['272271'], tier: 3 },
        ],
      },
      {
        districtName: 'Shahjahanpur',
        locations: [
          { locationName: 'Shahjahanpur City', pincodes: ['242001'], tier: 2 },
          { locationName: 'Tilhar', pincodes: ['242307'], tier: 3 },
          { locationName: 'Powayan', pincodes: ['242401'], tier: 3 },
          { locationName: 'Jalalabad', pincodes: ['242221'], tier: 3 },
        ],
      },
      {
        districtName: 'Shamli (Prabuddh Nagar)',
        locations: [
          { locationName: 'Shamli City', pincodes: ['247776'], tier: 2 },
          { locationName: 'Kairana', pincodes: ['247774'], tier: 3 },
          { locationName: 'Thana Bhawan', pincodes: ['247777'], tier: 3 },
        ],
      },
      {
        districtName: 'Shravasti',
        locations: [
          { locationName: 'Bhinga (HQ)', pincodes: ['271831'], tier: 3 },
          { locationName: 'Ikauna', pincodes: ['271845'], tier: 3 },
          { locationName: 'Shravasti (Buddhist Monastery)', pincodes: ['271831'], tier: 2 },
        ],
      },
      {
        districtName: 'Siddharthnagar',
        locations: [
          { locationName: 'Naugarh / Siddharthnagar Town', pincodes: ['272207'], tier: 3 },
          { locationName: 'Bansi', pincodes: ['272153'], tier: 3 },
          { locationName: 'Itwa', pincodes: ['272192'], tier: 3 },
          { locationName: 'Domariyaganj', pincodes: ['272189'], tier: 3 },
          { locationName: 'Shohratgarh', pincodes: ['272205'], tier: 3 },
        ],
      },
      {
        districtName: 'Sitapur',
        locations: [
          { locationName: 'Sitapur City', pincodes: ['261001'], tier: 2 },
          { locationName: 'Biswan', pincodes: ['261201'], tier: 3 },
          { locationName: 'Mahmudabad', pincodes: ['261203'], tier: 3 },
          { locationName: 'Naimisharanya (Tirth)', pincodes: ['261402'], tier: 2 },
        ],
      },
      {
        districtName: 'Sonbhadra',
        locations: [
          { locationName: 'Robertsganj (HQ)', pincodes: ['231216'], tier: 2 },
          { locationName: 'Renukoot (Hindalco)', pincodes: ['231217'], tier: 2 },
          { locationName: 'Anpara (Thermal Power Hub)', pincodes: ['231225'], tier: 2 },
          { locationName: 'Obra', pincodes: ['231219'], tier: 2 },
          { locationName: 'Shaktinagar (NTPC)', pincodes: ['231222'], tier: 2 },
        ],
      },
      {
        districtName: 'Sultanpur',
        locations: [
          { locationName: 'Sultanpur City', pincodes: ['228001'], tier: 2 },
          { locationName: 'Kadipur', pincodes: ['228145'], tier: 3 },
          { locationName: 'Jaisinghpur', pincodes: ['228141'], tier: 3 },
          { locationName: 'Lambhua', pincodes: ['228151'], tier: 3 },
        ],
      },
      {
        districtName: 'Unnao',
        locations: [
          { locationName: 'Unnao City', pincodes: ['209801'], tier: 2 },
          { locationName: 'Shuklaganj (Ganga Ghat)', pincodes: ['209861'], tier: 2 },
          { locationName: 'Purwa', pincodes: ['209825'], tier: 3 },
          { locationName: 'Safipur', pincodes: ['209871'], tier: 3 },
          { locationName: 'Bangarmau', pincodes: ['209868'], tier: 3 },
        ],
      },
      {
        districtName: 'Varanasi',
        locations: [
          { locationName: 'Varanasi Cantt & Sigra', pincodes: ['221002'], tier: 1 },
          { locationName: 'Varanasi Bhelupur & Lanka (BHU)', pincodes: ['221005', '221010'], tier: 1 },
          { locationName: 'Varanasi Godowlia & Dashashwamedh', pincodes: ['221001'], tier: 1 },
          { locationName: 'Varanasi Shivpur & Pandeypur', pincodes: ['221003', '221002'], tier: 1 },
          { locationName: 'Ramnagar (Fort Area)', pincodes: ['221008'], tier: 2 },
          { locationName: 'Pindra / Babatpur Airport', pincodes: ['221006'], tier: 1 },
        ],
      },
    ],
  },
  {
    stateName: 'Uttarakhand',
    code: 'UK',
    type: 'STATE',
    districts: [
      {
        districtName: 'Dehradun',
        locations: [
          { locationName: 'Dehradun Rajpur Road & Clock Tower', pincodes: ['248001'], tier: 1 },
          { locationName: 'Dehradun Patel Nagar / ISBT', pincodes: ['248001', '248002'], tier: 1 },
          { locationName: 'Dehradun Sahastradhara Rd', pincodes: ['248013'], tier: 1 },
          { locationName: 'Rishikesh / Tapovan', pincodes: ['249201'], tier: 1 },
          { locationName: 'Mussoorie (Queen of Hills)', pincodes: ['248179'], tier: 2 },
          { locationName: 'Vikasnagar', pincodes: ['248198'], tier: 2 },
        ],
      },
      {
        districtName: 'Haridwar',
        locations: [
          { locationName: 'Haridwar City & Har Ki Pauri', pincodes: ['249401'], tier: 1 },
          { locationName: 'SIDCUL Industrial Area', pincodes: ['249403'], tier: 1 },
          { locationName: 'Roorkee (IIT Roorkee)', pincodes: ['247667'], tier: 1 },
          { locationName: 'Laksar', pincodes: ['247663'], tier: 3 },
        ],
      },
      {
        districtName: 'Nainital',
        locations: [
          { locationName: 'Haldwani / Kathgodam', pincodes: ['263139', '263126'], tier: 1 },
          { locationName: 'Nainital Mall Road', pincodes: ['263001', '263002'], tier: 2 },
          { locationName: 'Ramnagar (Corbett Area)', pincodes: ['244715'], tier: 2 },
        ],
      },
      {
        districtName: 'Udham Singh Nagar',
        locations: [
          { locationName: 'Rudrapur SIDCUL Hub', pincodes: ['263153'], tier: 1 },
          { locationName: 'Kashipur Industrial Area', pincodes: ['244713'], tier: 2 },
          { locationName: 'Kichha', pincodes: ['263148'], tier: 3 },
          { locationName: 'Khatima', pincodes: ['262308'], tier: 3 },
        ],
      },
      {
        districtName: 'Almora',
        locations: [
          { locationName: 'Almora Town', pincodes: ['263601'], tier: 2 },
          { locationName: 'Ranikhet Cantt', pincodes: ['263645'], tier: 2 },
        ],
      },
      {
        districtName: 'Pauri Garhwal',
        locations: [
          { locationName: 'Kotdwar', pincodes: ['246149'], tier: 2 },
          { locationName: 'Pauri Town', pincodes: ['246001'], tier: 3 },
          { locationName: 'Srinagar Garhwal', pincodes: ['246174'], tier: 2 },
        ],
      },
    ],
  },
  {
    stateName: 'West Bengal',
    code: 'WB',
    type: 'STATE',
    districts: [
      {
        districtName: 'Kolkata',
        locations: [
          { locationName: 'Kolkata BBD Bagh / Dalhousie', pincodes: ['700001'], tier: 1 },
          { locationName: 'Kolkata Park Street / Camac Street', pincodes: ['700016', '700017'], tier: 1 },
          { locationName: 'Kolkata Salt Lake (Sector 1-5)', pincodes: ['700064', '700091', '700098'], tier: 1 },
          { locationName: 'Kolkata New Town / Rajarhat', pincodes: ['700156', '700160'], tier: 1 },
          { locationName: 'Kolkata Gariahat / Ballygunge', pincodes: ['700019'], tier: 1 },
          { locationName: 'Kolkata Alipore / New Alipore', pincodes: ['700027', '700053'], tier: 1 },
          { locationName: 'Kolkata Behala / Jadavpur', pincodes: ['700032', '700034'], tier: 1 },
        ],
      },
      {
        districtName: 'North 24 Parganas',
        locations: [
          { locationName: 'Dum Dum / Airport Area', pincodes: ['700028', '700052'], tier: 1 },
          { locationName: 'Barasat', pincodes: ['700124'], tier: 2 },
          { locationName: 'Barrackpore', pincodes: ['700120'], tier: 2 },
          { locationName: 'Bongaon', pincodes: ['743235'], tier: 3 },
        ],
      },
      {
        districtName: 'Howrah',
        locations: [
          { locationName: 'Howrah City & Station', pincodes: ['711101'], tier: 1 },
          { locationName: 'Shibpur / Mandirtala', pincodes: ['711102'], tier: 1 },
          { locationName: 'Uluberia', pincodes: ['711315'], tier: 2 },
        ],
      },
      {
        districtName: 'Darjeeling',
        locations: [
          { locationName: 'Siliguri City (Commercial Hub)', pincodes: ['734001', '734005'], tier: 1 },
          { locationName: 'Darjeeling Mall Road / GPO', pincodes: ['734101'], tier: 2 },
          { locationName: 'Kurseong', pincodes: ['734203'], tier: 3 },
        ],
      },
      {
        districtName: 'Paschim Bardhaman',
        locations: [
          { locationName: 'Asansol City', pincodes: ['713301', '713304'], tier: 2 },
          { locationName: 'Durgapur Steel City', pincodes: ['713201', '713216'], tier: 1 },
        ],
      },
      {
        districtName: 'Hooghly',
        locations: [
          { locationName: 'Serampore', pincodes: ['712201'], tier: 2 },
          { locationName: 'Chandannagar', pincodes: ['712136'], tier: 2 },
          { locationName: 'Chinsurah', pincodes: ['712101'], tier: 2 },
        ],
      },
    ],
  },
];

// =============================================================================
// REFINED CASCADING HELPER FUNCTIONS (State -> District -> Location -> PIN)
// =============================================================================

/**
 * Returns all 36 Indian States and Union Territories sorted strictly A -> Z
 */
export function getStatesList(): string[] {
  return INDIA_LOCATIONS.map(s => s.stateName);
}

/**
 * Returns all districts for a selected State/UT, sorted A -> Z
 */
export function getDistrictsForState(stateName: string): string[] {
  const state = INDIA_LOCATIONS.find(s => s.stateName.toLowerCase() === stateName.trim().toLowerCase());
  if (!state) return [];
  return state.districts.map(d => d.districtName).sort((a, b) => a.localeCompare(b));
}

/**
 * Returns all cities/towns/locations for a selected District in a State, sorted A -> Z
 */
export function getLocationsForDistrict(stateName: string, districtName: string): LocationItem[] {
  const state = INDIA_LOCATIONS.find(s => s.stateName.toLowerCase() === stateName.trim().toLowerCase());
  if (!state) return [];
  const district = state.districts.find(d => d.districtName.toLowerCase() === districtName.trim().toLowerCase());
  if (!district) return [];
  return [...district.locations].sort((a, b) => a.locationName.localeCompare(b.locationName));
}

/**
 * Returns all valid PIN codes for a selected City/Town/Location
 */
export function getPincodesForLocation(stateName: string, districtName: string, locationName: string): string[] {
  const locations = getLocationsForDistrict(stateName, districtName);
  const loc = locations.find(l => l.locationName.toLowerCase() === locationName.trim().toLowerCase());
  if (!loc) return [];
  return [...loc.pincodes].sort();
}

/**
 * Validates a 6-digit PIN code against the state, district, and location.
 * Returns deliverability info with estimated transit time.
 */
export function checkPinDeliverability(
  pin: string, 
  stateName?: string, 
  districtName?: string,
  locationName?: string
): { 
  deliverable: boolean; 
  reason?: string; 
  transitTime?: string;
  matchedLocation?: string;
  courierMessage?: string;
} {
  const cleanPin = (pin || '').trim();

  // Exactly 6 numeric digits
  if (!/^\d{6}$/.test(cleanPin)) {
    const reason = 'PIN code must be exactly 6 numeric digits.';
    return { deliverable: false, reason, courierMessage: reason };
  }

  // Find PIN in master database
  for (const state of INDIA_LOCATIONS) {
    for (const district of state.districts) {
      for (const loc of district.locations) {
        if (loc.pincodes.includes(cleanPin)) {
          // If state is specified, verify it matches
          if (stateName && stateName.trim() !== '') {
            if (state.stateName.toLowerCase() !== stateName.trim().toLowerCase()) {
              const reason = `PIN ${cleanPin} belongs to ${state.stateName}, not ${stateName}.`;
              return {
                deliverable: false,
                reason,
                courierMessage: reason,
              };
            }
          }

          // If district is specified, verify it matches
          if (districtName && districtName.trim() !== '') {
            const dNorm = districtName.trim().toLowerCase();
            const currDNorm = district.districtName.toLowerCase();
            const distMatch = currDNorm === dNorm || currDNorm.includes(dNorm) || dNorm.includes(currDNorm);
            if (!distMatch) {
              const reason = `PIN ${cleanPin} belongs to ${district.districtName} district in ${state.stateName}.`;
              return {
                deliverable: false,
                reason,
                courierMessage: reason,
              };
            }
          }

          // If location is specified, verify it matches
          if (locationName && locationName.trim() !== '') {
            const lNorm = locationName.trim().toLowerCase();
            const currLNorm = loc.locationName.toLowerCase();
            const locMatch = currLNorm === lNorm || currLNorm.includes(lNorm) || lNorm.includes(currLNorm);
            if (!locMatch) {
              const reason = `PIN ${cleanPin} belongs to ${loc.locationName} (${district.districtName}).`;
              return {
                deliverable: false,
                reason,
                courierMessage: reason,
              };
            }
          }

          const transit = loc.tier === 1 
            ? '2 to 3 business days (Metro Express)'
            : loc.tier === 2 
            ? '3 to 4 business days (Standard Courier)'
            : '4 to 6 business days (Regional Transit)';

          return {
            deliverable: true,
            transitTime: transit,
            matchedLocation: `${loc.locationName}, ${district.districtName}, ${state.stateName}`,
            courierMessage: `Delivers to ${loc.locationName}, ${district.districtName} in ${transit}`,
          };
        }
      }
    }
  }

  const reason = `PIN code ${cleanPin} is currently outside our courier delivery network.`;
  return {
    deliverable: false,
    reason,
    courierMessage: reason,
  };
}

/**
 * Reverse lookup from a 6-digit PIN code to auto-detect State, District, and Location
 */
export function lookupPincode(pin: string): { 
  state: string; 
  district: string; 
  location: string;
  allPincodes: string[];
} | null {
  const cleanPin = (pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) return null;

  for (const state of INDIA_LOCATIONS) {
    for (const district of state.districts) {
      for (const loc of district.locations) {
        if (loc.pincodes.includes(cleanPin)) {
          return {
            state: state.stateName,
            district: district.districtName,
            location: loc.locationName,
            allPincodes: loc.pincodes,
          };
        }
      }
    }
  }
  return null;
}

// =============================================================================
// BACKWARDS COMPATIBILITY HELPERS
// =============================================================================

export interface CityData {
  cityName: string;
  pincodes: string[];
  tier: 1 | 2 | 3;
}

export function getCitiesForState(stateName: string): CityData[] {
  const state = INDIA_LOCATIONS.find(s => s.stateName.toLowerCase() === stateName.trim().toLowerCase());
  if (!state) return [];
  const results: CityData[] = [];
  for (const dist of state.districts) {
    for (const loc of dist.locations) {
      results.push({
        cityName: `${loc.locationName} (${dist.districtName})`,
        pincodes: loc.pincodes,
        tier: loc.tier,
      });
    }
  }
  return results;
}

export function getPincodesForCity(stateName: string, cityName: string): string[] {
  const cities = getCitiesForState(stateName);
  const match = cities.find(c => c.cityName.toLowerCase() === cityName.toLowerCase());
  return match ? match.pincodes : [];
}
