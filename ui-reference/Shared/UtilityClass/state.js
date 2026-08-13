// Shared/UtilityClass/state.js
class HotelState {
    static get(key, defaultValue = null) {
        const val = localStorage.getItem('hbs_state_' + key);
        return val ? JSON.parse(val) : defaultValue;
    }
    static set(key, value) {
        localStorage.setItem('hbs_state_' + key, JSON.stringify(value));
    }

    // Predefined default states to inject if missing
    static initDefaults() {
        if (!this.get('savedCards')) {
            this.set('savedCards', [
                { id: 'card_1', type: 'Visa', last4: '4242', exp: '12/28', name: 'Bennet Customer' },
                { id: 'card_2', type: 'Mastercard', last4: '5555', exp: '08/27', name: 'Bennet Customer' },
                { id: 'card_3', type: 'Amex', last4: '3782', exp: '10/26', name: 'Bennet Customer' }
            ]);
        }
        if (!this.get('currentUser')) {
            this.set('currentUser', {
                name: 'Bennet Customer',
                firstName: 'Bennet',
                lastName: 'Customer',
                email: 'bennet@hbs.local',
                phone: '+91 9876543210',
                role: 'Customer',
                loyaltyPoints: 1250,
                memberTier: 'Gold'
            });
        }
        let currentBookings = this.get('bookings');
        if (!currentBookings) {
            this.set('bookings', [
                {
                    id: 'EE-COB-260625-7852',
                    txnId: 'TXN7894561230',
                    branch: 'Coimbatore',
                    hotelName: 'The Elegant Suites Coimbatore',
                    image: '../../../assets/images/hotel_cbe.png',
                    checkIn: '20 Nov 2026',
                    checkInDay: 'Friday',
                    checkOut: '23 Nov 2026',
                    checkOutDay: 'Monday',
                    amount: '23,010.00',
                    status: 'Upcoming',
                    email: 'bennet@hbs.local',
                    hotelId: 'HTL002',
                    roomId: 'RM008',
                    customerId: 'USR000', // Implicit Bennet Customer
                    nights: 3,
                    adultsCount: 2,
                    childrenCount: 0,
                    guestDetails: { primaryGuest: { name: 'Bennet Customer', email: 'bennet@hbs.local', phone: '+91 9876543210', idType: 'Aadhaar', idNumber: '1111-2222-3333' } },
                    totalAmount: 20000,
                    taxAmount: 3010,
                    grandTotal: 23010,
                    paymentStatus: 'Paid',
                    paymentMethod: 'Card',
                    bookingStatus: 'Confirmed',
                    specialRequests: '',
                    createdAt: '2026-06-01T10:00:00Z',
                    updatedAt: '2026-06-01T10:00:00Z'
                },
                {
                    id: 'EE-SAL-260101-1234',
                    txnId: 'TXN1234567890',
                    branch: 'Salem',
                    hotelName: 'Elegant Enclave Salem',
                    image: '../../../assets/images/hotel_salem.png',
                    checkIn: '15 Jul 2026',
                    checkInDay: 'Wednesday',
                    checkOut: '18 Jul 2026',
                    checkOutDay: 'Saturday',
                    amount: '8,400.00',
                    status: 'Upcoming',
                    email: 'arjun.mehta@elegantenclave.in',
                    hotelId: 'HTL001',
                    roomId: 'RM002',
                    customerId: 'USR006',
                    nights: 3,
                    adultsCount: 2,
                    childrenCount: 0,
                    guestDetails: { primaryGuest: { name: 'Arjun Mehta', email: 'arjun.mehta@elegantenclave.in', phone: '+91-9876543210', idType: 'Aadhaar', idNumber: '1234-5678-9012' } },
                    totalAmount: 8400,
                    taxAmount: 1512,
                    grandTotal: 9912,
                    paymentStatus: 'Paid',
                    paymentMethod: 'Card',
                    bookingStatus: 'Confirmed',
                    specialRequests: 'Late check-in requested',
                    createdAt: '2026-06-10T11:30:00Z',
                    updatedAt: '2026-06-10T11:30:00Z'
                },
                {
                    id: 'EE-CHE-260501-1235',
                    txnId: 'TXN1234567891',
                    branch: 'Chennai',
                    hotelName: 'Elegant Enclave Chennai',
                    image: '../../../assets/images/hotel_chennai.png',
                    checkIn: '01 Jul 2026',
                    checkInDay: 'Wednesday',
                    checkOut: '03 Jul 2026',
                    checkOutDay: 'Friday',
                    amount: '14,400.00',
                    status: 'Active',
                    email: 'neha.sharma@elegantenclave.in',
                    hotelId: 'HTL003',
                    roomId: 'RM014',
                    customerId: 'USR007',
                    nights: 2,
                    adultsCount: 2,
                    childrenCount: 1,
                    guestDetails: { primaryGuest: { name: 'Neha Sharma', email: 'neha.sharma@elegantenclave.in', phone: '+91-9876543211', idType: 'Aadhaar', idNumber: '2222-5678-9012' } },
                    totalAmount: 14400,
                    taxAmount: 2592,
                    grandTotal: 16992,
                    paymentStatus: 'Paid',
                    paymentMethod: 'UPI',
                    bookingStatus: 'CheckedIn',
                    specialRequests: '',
                    createdAt: '2026-06-15T11:30:00Z',
                    updatedAt: '2026-07-01T14:30:00Z'
                },
                {
                    id: 'EE-COB-260501-1236',
                    txnId: 'TXN1234567892',
                    branch: 'Coimbatore',
                    hotelName: 'Elegant Enclave Coimbatore',
                    image: '../../../assets/images/hotel_cbe.png',
                    checkIn: '05 Jul 2026',
                    checkInDay: 'Sunday',
                    checkOut: '08 Jul 2026',
                    checkOutDay: 'Wednesday',
                    amount: '8,400.00',
                    status: 'Active',
                    email: 'priya.raj@elegantenclave.in',
                    hotelId: 'HTL002',
                    roomId: 'RM007',
                    customerId: 'USR008',
                    nights: 3,
                    adultsCount: 1,
                    childrenCount: 0,
                    guestDetails: { primaryGuest: { name: 'Priya Raj', email: 'priya.raj@elegantenclave.in', phone: '+91-9876543212', idType: 'PAN', idNumber: 'ABCDE1234F' } },
                    totalAmount: 8400,
                    taxAmount: 1512,
                    grandTotal: 9912,
                    paymentStatus: 'Paid',
                    paymentMethod: 'Card',
                    bookingStatus: 'CheckedIn',
                    specialRequests: '',
                    createdAt: '2026-06-20T11:30:00Z',
                    updatedAt: '2026-07-05T15:30:00Z'
                },
                {
                    id: 'EE-SAL-260301-1237',
                    txnId: 'TXN1234567893',
                    branch: 'Salem',
                    hotelName: 'Elegant Enclave Salem',
                    image: '../../../assets/images/hotel_salem.png',
                    checkIn: '01 Jun 2026',
                    checkInDay: 'Monday',
                    checkOut: '05 Jun 2026',
                    checkOutDay: 'Friday',
                    amount: '18,000.00',
                    status: 'Completed',
                    email: 'ravi.teja@elegantenclave.in',
                    hotelId: 'HTL001',
                    roomId: 'RM003',
                    customerId: 'USR009',
                    nights: 4,
                    adultsCount: 2,
                    childrenCount: 0,
                    guestDetails: { primaryGuest: { name: 'Ravi Teja', email: 'ravi.teja@elegantenclave.in', phone: '+91-9876543213', idType: 'Passport', idNumber: 'Z1234567' } },
                    totalAmount: 18000,
                    taxAmount: 3240,
                    grandTotal: 21240,
                    paymentStatus: 'Paid',
                    paymentMethod: 'Net Banking',
                    bookingStatus: 'CheckedOut',
                    specialRequests: '',
                    createdAt: '2026-05-15T11:30:00Z',
                    updatedAt: '2026-06-05T11:30:00Z'
                },
                {
                    id: 'EE-CHE-260301-1238',
                    txnId: 'TXN1234567894',
                    branch: 'Chennai',
                    hotelName: 'Elegant Enclave Chennai',
                    image: '../../../assets/images/hotel_chennai.png',
                    checkIn: '10 Jun 2026',
                    checkInDay: 'Wednesday',
                    checkOut: '12 Jun 2026',
                    checkOutDay: 'Friday',
                    amount: '24,000.00',
                    status: 'Completed',
                    email: 'sneha.reddy@elegantenclave.in',
                    hotelId: 'HTL003',
                    roomId: 'RM015',
                    customerId: 'USR010',
                    nights: 2,
                    adultsCount: 2,
                    childrenCount: 2,
                    guestDetails: { primaryGuest: { name: 'Sneha Reddy', email: 'sneha.reddy@elegantenclave.in', phone: '+91-9876543214', idType: 'Aadhaar', idNumber: '3333-5678-9012' } },
                    totalAmount: 24000,
                    taxAmount: 4320,
                    grandTotal: 28320,
                    paymentStatus: 'Paid',
                    paymentMethod: 'Card',
                    bookingStatus: 'CheckedOut',
                    specialRequests: '',
                    createdAt: '2026-05-20T11:30:00Z',
                    updatedAt: '2026-06-12T11:30:00Z'
                },
                {
                    id: 'EE-SAL-260401-1239',
                    txnId: 'TXN1234567895',
                    branch: 'Salem',
                    hotelName: 'Elegant Enclave Salem',
                    image: '../../../assets/images/hotel_salem.png',
                    checkIn: '20 Jun 2026',
                    checkInDay: 'Saturday',
                    checkOut: '22 Jun 2026',
                    checkOutDay: 'Monday',
                    amount: '5,600.00',
                    status: 'Cancelled',
                    email: 'arjun.mehta@elegantenclave.in',
                    hotelId: 'HTL001',
                    roomId: 'RM001',
                    customerId: 'USR006',
                    nights: 2,
                    adultsCount: 1,
                    childrenCount: 0,
                    guestDetails: { primaryGuest: { name: 'Arjun Mehta', email: 'arjun.mehta@elegantenclave.in', phone: '+91-9876543210', idType: 'Aadhaar', idNumber: '1234-5678-9012' } },
                    totalAmount: 5600,
                    taxAmount: 1008,
                    grandTotal: 6608,
                    paymentStatus: 'Refunded',
                    paymentMethod: 'Card',
                    bookingStatus: 'Cancelled',
                    specialRequests: '',
                    createdAt: '2026-06-01T11:30:00Z',
                    updatedAt: '2026-06-18T11:30:00Z'
                },
                {
                    id: 'EE-CHE-260801-1240',
                    txnId: 'TXN1234567896',
                    branch: 'Chennai',
                    hotelName: 'Elegant Enclave Chennai',
                    image: '../../../assets/images/hotel_chennai.png',
                    checkIn: '15 Aug 2026',
                    checkInDay: 'Saturday',
                    checkOut: '17 Aug 2026',
                    checkOutDay: 'Monday',
                    amount: '9,000.00',
                    status: 'Upcoming',
                    email: 'neha.sharma@elegantenclave.in',
                    hotelId: 'HTL003',
                    roomId: 'RM011',
                    customerId: 'USR007',
                    nights: 2,
                    adultsCount: 2,
                    childrenCount: 0,
                    guestDetails: { primaryGuest: { name: 'Neha Sharma', email: 'neha.sharma@elegantenclave.in', phone: '+91-9876543211', idType: 'Aadhaar', idNumber: '2222-5678-9012' } },
                    totalAmount: 9000,
                    taxAmount: 1620,
                    grandTotal: 10620,
                    paymentStatus: 'Paid',
                    paymentMethod: 'UPI',
                    bookingStatus: 'Confirmed',
                    specialRequests: 'High floor preferred',
                    createdAt: '2026-07-01T11:30:00Z',
                    updatedAt: '2026-07-01T11:30:00Z'
                }
            ]);
        } else {
            // Force inject mock data for review if lacking
            if (currentBookings.length < 25) {
                const dummyBookings = [];
                const branches = ['Salem', 'Coimbatore', 'Chennai'];
                const hIds = ['HTL001', 'HTL002', 'HTL003'];
                const statuses = ['Confirmed', 'Pending', 'CheckedIn', 'CheckedOut', 'Cancelled'];
                const rmds = ['RM001', 'RM002', 'RM003', 'RM004', 'RM011', 'RM012'];
                
                for(let i=1; i<=30; i++) {
                    const bIdx = i % 3;
                    const date = new Date(2026, 6, (i % 28) + 1); // July 2026
                    const checkout = new Date(2026, 6, (i % 28) + 3);
                    
                    const pad = (n) => n.toString().padStart(2, '0');
                    const dStrIn = `${pad(date.getDate())} Jul 2026`;
                    const dStrOut = `${pad(checkout.getDate())} Jul 2026`;
                    const dateIso = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
                    const outIso = `${checkout.getFullYear()}-${pad(checkout.getMonth()+1)}-${pad(checkout.getDate())}`;
                    
                    const amt = 5000 + (Math.random() * 5000);
                    const grand = amt * 1.18;
                    
                    dummyBookings.push({
                        id: 'EE-SIM-' + Date.now().toString().slice(-4) + '-' + i,
                        txnId: 'TXN' + Math.floor(Math.random() * 10000000),
                        branch: branches[bIdx],
                        hotelName: 'Elegant Enclave ' + branches[bIdx],
                        hotelId: hIds[bIdx],
                        roomId: rmds[i % rmds.length],
                        checkIn: dStrIn,
                        checkOut: dStrOut,
                        status: i % 2 === 0 ? 'Upcoming' : 'Completed',
                        bookingStatus: statuses[i % statuses.length],
                        amount: amt.toFixed(2),
                        grandTotal: grand,
                        paymentStatus: 'Paid',
                        customerId: 'USR00' + ((i % 5) + 1),
                        email: 'user' + i + '@test.com',
                        createdAt: new Date().toISOString()
                    });
                }
                currentBookings.push(...dummyBookings);
                this.set('bookings', currentBookings);
            }

            let migrated = false;
            currentBookings.forEach(b => {
                if (b.checkIn === '25 Jun 2026' || b.checkIn === '25 jun 2026') {
                    b.checkIn = '20 Nov 2026';
                    b.checkInDay = 'Friday';
                    b.checkOut = '23 Nov 2026';
                    b.checkOutDay = 'Monday';
                    migrated = true;
                }
            });
            if (migrated) {
                this.set('bookings', currentBookings);
            }
        }

        // SEED_VERSION: 4 — bump this to force a full re-seed of users, hotels, and rooms
        const SEED_VERSION = 4;
        const currentSeedVersion = this.get('seedVersion') || 0;
        const shouldReseed = !this.get('users') || this.get('users').length === 0 || currentSeedVersion < SEED_VERSION;

        if (shouldReseed) {
            this.set('seedVersion', SEED_VERSION);
            this.set('users', [
                // --- SYSTEM ADMINISTRATORS ---
                { id: 'USR001', firstName: 'Sridhar', lastName: 'Kumar', email: 'sridhar.kumar@elegantenclave.in', password: 'Secure@123', role: 'Admin', phone: '+91-9876543201', address: { street: '1, Admin St', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }, createdAt: '2025-01-01T09:00:00Z', status: 'Active', loyaltyPoints: 0, memberTier: '' },
                { id: 'USR002', firstName: 'Anita', lastName: 'Desai', email: 'anita.desai@elegantenclave.in', password: 'Secure@123', role: 'Admin', phone: '+91-9876543202', address: { street: '2, Admin St', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002' }, createdAt: '2025-01-02T09:00:00Z', status: 'Active', loyaltyPoints: 0, memberTier: '' },
                { id: 'USR_ADMIN', firstName: 'System', lastName: 'Admin', email: 'admin@hbs.local', password: 'Admin@123', role: 'Admin', phone: '+91-9000000001', address: { street: 'HBS HQ', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }, createdAt: '2025-01-01T09:00:00Z', status: 'Active', loyaltyPoints: 0, memberTier: '' },
                // --- HOTEL MANAGERS ---
                { id: 'USR003', firstName: 'Raj', lastName: 'Patel', email: 'raj.patel@elegantenclave.in', password: 'Secure@123', role: 'Manager', phone: '+91-9876543203', address: { street: '3, Manager St', city: 'Salem', state: 'Tamil Nadu', pincode: '636001' }, createdAt: '2025-02-01T09:00:00Z', status: 'Active', assignedHotelId: 'HTL001', loyaltyPoints: 0, memberTier: '' },
                { id: 'USR004', firstName: 'Kavitha', lastName: 'Rao', email: 'kavitha.rao@elegantenclave.in', password: 'Secure@123', role: 'Manager', phone: '+91-9876543204', address: { street: '4, Manager St', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001' }, createdAt: '2025-02-02T09:00:00Z', status: 'Active', assignedHotelId: 'HTL002', loyaltyPoints: 0, memberTier: '' },
                { id: 'USR005', firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@elegantenclave.in', password: 'Secure@123', role: 'Manager', phone: '+91-9876543205', address: { street: '5, Manager St', city: 'Chennai', state: 'Tamil Nadu', pincode: '600003' }, createdAt: '2025-02-03T09:00:00Z', status: 'Active', assignedHotelId: 'HTL003', loyaltyPoints: 0, memberTier: '' },
                { id: 'USR_MGR', firstName: 'Chennai', lastName: 'Manager', email: 'chennaimanager@hbs.local', password: 'Manager@123', role: 'Manager', phone: '+91-9000000002', address: { street: '45, Mount Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002' }, createdAt: '2025-02-01T09:00:00Z', status: 'Active', assignedHotelId: 'HTL003', loyaltyPoints: 0, memberTier: '' },
                // --- CUSTOMERS ---
                { id: 'USR006', firstName: 'Arjun', lastName: 'Mehta', email: 'arjun.mehta@elegantenclave.in', password: 'Secure@123', role: 'Customer', phone: '+91-9876543210', address: { street: '12, Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' }, createdAt: '2025-03-15T09:00:00Z', status: 'Active', loyaltyPoints: 1250, memberTier: 'Gold' },
                { id: 'USR007', firstName: 'Neha', lastName: 'Sharma', email: 'neha.sharma@elegantenclave.in', password: 'Secure@123', role: 'Customer', phone: '+91-9876543211', address: { street: '13, Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' }, createdAt: '2025-03-16T09:00:00Z', status: 'Active', loyaltyPoints: 500, memberTier: 'Silver' },
                { id: 'USR008', firstName: 'Priya', lastName: 'Raj', email: 'priya.raj@elegantenclave.in', password: 'Secure@123', role: 'Customer', phone: '+91-9876543212', address: { street: '14, Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' }, createdAt: '2025-03-17T09:00:00Z', status: 'Active', loyaltyPoints: 300, memberTier: 'Silver' },
                { id: 'USR009', firstName: 'Ravi', lastName: 'Teja', email: 'ravi.teja@elegantenclave.in', password: 'Secure@123', role: 'Customer', phone: '+91-9876543213', address: { street: '15, Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' }, createdAt: '2025-03-18T09:00:00Z', status: 'Active', loyaltyPoints: 200, memberTier: 'Silver' },
                { id: 'USR010', firstName: 'Sneha', lastName: 'Reddy', email: 'sneha.reddy@elegantenclave.in', password: 'Secure@123', role: 'Customer', phone: '+91-9876543214', address: { street: '16, Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' }, createdAt: '2025-03-19T09:00:00Z', status: 'Active', loyaltyPoints: 100, memberTier: 'Silver' },
                { id: 'USR_BENNET', firstName: 'Bennet', lastName: 'Customer', email: 'bennet@hbs.local', password: 'Customer@123', role: 'Customer', phone: '+91 9876543210', address: { street: 'Demo Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }, createdAt: '2025-01-01T09:00:00Z', status: 'Active', loyaltyPoints: 1250, memberTier: 'Gold' }
            ]);

            // --- RE-SEED HOTELS ---
            this.set('hotels', [
                { id: 'HTL001', name: 'Elegant Enclave Salem', location: 'Salem, Tamil Nadu', address: '14, Saradha College Road, Fairlands, Salem - 636016', rating: 4.6, totalRooms: 45, managerId: 'USR003', status: 'Active', amenities: ['Free WiFi', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Parking', 'Conference Hall'], imageUrl: '../../../assets/images/hotel_salem.png', description: 'A premier luxury hotel in the heart of Salem.', contactPhone: '+91-427-2234567', contactEmail: 'salem@elegantenclave.in', checkInTime: '14:00', checkOutTime: '11:00', priceStartsFrom: 2800, createdAt: '2024-01-10T10:00:00Z' },
                { id: 'HTL002', name: 'Elegant Enclave Coimbatore', location: 'Coimbatore, Tamil Nadu', address: '12, Avinashi Road, Coimbatore - 641018', rating: 4.7, totalRooms: 60, managerId: 'USR004', status: 'Active', amenities: ['Free WiFi', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Parking', 'Conference Hall'], imageUrl: '../../../assets/images/hotel_cbe.png', description: 'A premier luxury hotel in the heart of Coimbatore.', contactPhone: '+91-422-2234567', contactEmail: 'coimbatore@elegantenclave.in', checkInTime: '14:00', checkOutTime: '11:00', priceStartsFrom: 3500, createdAt: '2024-01-15T10:00:00Z' },
                { id: 'HTL003', name: 'Elegant Enclave Chennai', location: 'Chennai, Tamil Nadu', address: '45, Mount Road, Chennai - 600002', rating: 4.8, totalRooms: 80, managerId: 'USR005', status: 'Active', amenities: ['Free WiFi', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Parking', 'Conference Hall'], imageUrl: '../../../assets/images/hotel_chennai.png', description: 'A premier luxury hotel in the heart of Chennai.', contactPhone: '+91-44-2234567', contactEmail: 'chennai@elegantenclave.in', checkInTime: '14:00', checkOutTime: '11:00', priceStartsFrom: 4500, createdAt: '2024-01-20T10:00:00Z' }
            ]);

            // --- RE-SEED ROOMS (5 per hotel, all Available) ---
            const roomSeed = [];
            const hotelConfigs = [
                { hId: 'HTL001', base: 1, prices: [2800, 4500, 7200, 12000] },
                { hId: 'HTL002', base: 6, prices: [3500, 5500, 8500, 14000] },
                { hId: 'HTL003', base: 11, prices: [4500, 7000, 11000, 18000] }
            ];
            hotelConfigs.forEach(({ hId, base, prices }) => {
                const pad = n => 'RM' + String(n).padStart(3, '0');
                roomSeed.push({ id: pad(base), hotelId: hId, roomNumber: '101', type: 'Standard', floor: 1, pricePerNight: prices[0], capacity: { adults: 2, children: 1 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Spacious standard room with city view.', bedType: 'King', size: '35 sq.m' });
                // roomSeed.push({ id: pad(base + 1), hotelId: hId, roomNumber: '102', type: 'Standard', floor: 1, pricePerNight: prices[0], capacity: { adults: 2, children: 1 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Spacious standard room with garden view.', bedType: 'Twin', size: '35 sq.m' });
                roomSeed.push({ id: pad(base + 2), hotelId: hId, roomNumber: '201', type: 'Deluxe', floor: 2, pricePerNight: prices[1], capacity: { adults: 2, children: 2 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe', 'Bathtub'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Deluxe room with extra space and bathtub.', bedType: 'King', size: '45 sq.m' });
                roomSeed.push({ id: pad(base + 3), hotelId: hId, roomNumber: '301', type: 'Suite', floor: 3, pricePerNight: prices[2], capacity: { adults: 3, children: 2 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe', 'Bathtub', 'Living Area'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Luxury suite with separate living area.', bedType: 'King', size: '60 sq.m' });
                roomSeed.push({ id: pad(base + 4), hotelId: hId, roomNumber: '401', type: 'Presidential Suite', floor: 4, pricePerNight: prices[3], capacity: { adults: 4, children: 2 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe', 'Jacuzzi', 'Living Area', 'Dining Area'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Top tier presidential suite.', bedType: 'King', size: '100 sq.m' });
            });
            this.set('rooms', roomSeed);
        }
        if (!this.get('hotels') || this.get('hotels').length === 0) {
            this.set('hotels', [
                { id: 'HTL001', name: 'Elegant Enclave Salem', location: 'Salem, Tamil Nadu', address: '14, Saradha College Road, Fairlands, Salem - 636016', rating: 4.6, totalRooms: 45, managerId: 'USR003', status: 'Active', amenities: ['Free WiFi', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Parking', 'Conference Hall'], imageUrl: '../../../assets/images/hotel_salem.png', description: 'A premier luxury hotel in the heart of Salem...', contactPhone: '+91-427-2234567', contactEmail: 'salem@elegantenclave.in', checkInTime: '14:00', checkOutTime: '11:00', priceStartsFrom: 2800, createdAt: '2024-01-10T10:00:00Z' },
                { id: 'HTL002', name: 'Elegant Enclave Coimbatore', location: 'Coimbatore, Tamil Nadu', address: '12, Avinashi Road, Coimbatore - 641018', rating: 4.7, totalRooms: 60, managerId: 'USR004', status: 'Active', amenities: ['Free WiFi', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Parking', 'Conference Hall'], imageUrl: '../../../assets/images/hotel_cbe.png', description: 'A premier luxury hotel in the heart of Coimbatore...', contactPhone: '+91-422-2234567', contactEmail: 'coimbatore@elegantenclave.in', checkInTime: '14:00', checkOutTime: '11:00', priceStartsFrom: 3500, createdAt: '2024-01-15T10:00:00Z' },
                { id: 'HTL003', name: 'Elegant Enclave Chennai', location: 'Chennai, Tamil Nadu', address: '45, Mount Road, Chennai - 600002', rating: 4.8, totalRooms: 80, managerId: 'USR005', status: 'Active', amenities: ['Free WiFi', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Parking', 'Conference Hall'], imageUrl: '../../../assets/images/hotel_chennai.png', description: 'A premier luxury hotel in the heart of Chennai...', contactPhone: '+91-44-2234567', contactEmail: 'chennai@elegantenclave.in', checkInTime: '14:00', checkOutTime: '11:00', priceStartsFrom: 4500, createdAt: '2024-01-20T10:00:00Z' }
            ]);
        }
        if (!this.get('rooms') || this.get('rooms').length === 0) {
            const roomSeed = [];
            const hIds = ['HTL001', 'HTL002', 'HTL003'];
            let rId = 1;
            hIds.forEach(hId => {
                roomSeed.push({ id: `RM00${rId++}`, hotelId: hId, roomNumber: '101', type: 'Standard', floor: 1, pricePerNight: 2800, capacity: { adults: 2, children: 1 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Spacious standard room with city view...', bedType: 'King', size: '35 sq.m' });
                // roomSeed.push({ id: `RM00${rId++}`, hotelId: hId, roomNumber: '102', type: 'Standard', floor: 1, pricePerNight: 2800, capacity: { adults: 2, children: 1 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Spacious standard room with city view...', bedType: 'King', size: '35 sq.m' });
                roomSeed.push({ id: `RM00${rId++}`, hotelId: hId, roomNumber: '201', type: 'Deluxe', floor: 2, pricePerNight: 4500, capacity: { adults: 2, children: 2 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe', 'Bathtub'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Deluxe room with extra space...', bedType: 'King', size: '45 sq.m' });
                roomSeed.push({ id: `RM00${rId++}`, hotelId: hId, roomNumber: '301', type: 'Suite', floor: 3, pricePerNight: 7200, capacity: { adults: 3, children: 2 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe', 'Bathtub', 'Living Area'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Luxury suite with separate living area...', bedType: 'King', size: '60 sq.m' });
                roomSeed.push({ id: `RM00${rId++}`, hotelId: hId, roomNumber: '401', type: 'Presidential Suite', floor: 4, pricePerNight: 12000, capacity: { adults: 4, children: 2 }, amenities: ['AC', 'TV', 'WiFi', 'Mini Bar', 'Safe', 'Jacuzzi', 'Living Area', 'Dining Area'], status: 'Available', images: ['../../../assets/images/room_classic.png'], description: 'Top tier presidential suite...', bedType: 'King', size: '100 sq.m' });
            });
            this.set('rooms', roomSeed);
        }
        if (!this.get('roomTypes')) {
            this.set('roomTypes', []);
        }
                if (!this.get('housekeeping') || this.get('housekeeping').length === 0) {
            const hk = [];
            for (let i = 1; i <= 10; i++) {
                hk.push({ id: `HK00${i}`, hotelId: 'HTL001', roomId: `RM001`, roomNumber: '101', taskType: 'Room Cleaning', assignedTo: 'Kavitha S.', priority: 'High', status: 'Pending', scheduledFor: '2026-07-07T10:00:00Z', completedAt: null, notes: 'Guest checked out. Full clean required.' });
            }
            this.set('housekeeping', hk);
        }
        if (!this.get('notifications') || this.get('notifications').length === 0) {
            const notifs = [];
            for (let i = 1; i <= 12; i++) {
                notifs.push({ id: `NOTIF00${i}`, recipientId: 'USR006', recipientRole: 'Customer', type: 'BookingConfirmed', title: 'Booking Confirmed', message: `Your booking has been confirmed ${i}.`, isRead: false, createdAt: '2026-06-10T11:35:00Z', relatedId: 'EE-SAL-260101-1234' });
            }
            this.set('notifications', notifs);
        }
        let currentContent = this.get('content');
        if (!currentContent || !currentContent.layout) {
            currentContent = {
                layout: ['hero', 'promotions', 'featured', 'about', 'footer'],
                hero: {
                    image: 'assets/images/hero_bg.png',
                    heading: 'Where Luxury Meets Comfort',
                    subheading: 'Experience world-class hospitality across our three premium properties in Salem, Coimbatore, and Chennai.',
                    btnText: 'Explore Our Hotels',
                    btnLink: '#explore'
                },
                promotions: [
                    { id: 'promo1', title: 'Monsoon Getaway', discount: '25% Off', coupon: 'MONSOON25', validUntil: '2026-08-31', image: 'assets/images/hotel_salem.png' },
                    { id: 'promo2', title: 'Early Bird', discount: '15% Off', coupon: 'EARLY15', validUntil: '2026-12-31', image: 'assets/images/hotel_chennai.png' }
                ],
                featuredRooms: ['RT-001', 'RT-003', 'RT-004'],
                about: {
                    heading: 'About Elegant Enclave',
                    subheading: 'A Legacy of Excellence',
                    vision: 'To be the most preferred luxury hospitality brand in South India.',
                    mission: 'Delivering exceptional guest experiences through personalized service.',
                    history: 'Established in 2010, Elegant Enclave has grown from a single boutique hotel to three premium properties.',
                    ceoMessage: 'Welcome to your home away from home.',
                    image: 'assets/images/about_hotel.jpg'
                },
                footer: {
                    phone: '+91-44-2234567, +91-422-2234567, +91-427-2234567',
                    email: 'info@elegantenclave.in',
                    address: 'Chennai - Coimbatore - Salem',
                    workingHours: '24/7 Front Desk',
                    social: { facebook: '#', twitter: '#', instagram: '#', linkedin: '#' },
                    copyright: '© 2026 Elegant Enclave. All rights reserved.',
                    mapUrl: 'https://maps.google.com'
                },
                seo: {
                    title: 'Elegant Enclave - Premium Hotels',
                    description: 'Book your luxury stay at Elegant Enclave.',
                    keywords: 'hotel, luxury, booking, chennai, salem, coimbatore',
                    favicon: 'assets/images/logo.png'
                }
            };
        }
        this.set('content', currentContent);
        if (!this.get('guests')) {
            this.set('guests', []);
        }
    }

    static get currentUser() { return this.get('currentUser'); }
    static set currentUser(val) { this.set('currentUser', val); }

    static get savedCards() { return this.get('savedCards', []); }
    static set savedCards(val) { this.set('savedCards', val); }

    static addSavedCard(card) {
        const cards = this.savedCards;
        cards.push(card);
        this.savedCards = cards;
    }

    static get bookings() { return this.get('bookings', []); }
    static set bookings(val) { this.set('bookings', val); }

    static updateBookingStatus(id, newStatus) {
        const b = this.bookings;
        const index = b.findIndex(x => x.id === id);
        if (index !== -1) {
            b[index].status = newStatus;
            this.bookings = b;
        }
    }



    static get notifications() { return this.get('notifications', []); }
    static set notifications(val) { this.set('notifications', val); }

    static get users() { return this.get('users', []); }
    static set users(val) { this.set('users', val); }

    static get hotels() { return this.get('hotels', []); }
    static set hotels(val) { this.set('hotels', val); }

    static get roomTypes() { return this.get('roomTypes', []); }
    static set roomTypes(val) { this.set('roomTypes', val); }

    
    static get housekeeping() { return this.get('housekeeping', []); }
    static set housekeeping(val) { this.set('housekeeping', val); }

    static get guests() { return this.get('guests', []); }
    static set guests(val) { this.set('guests', val); }

    static get rooms() { return this.get('rooms', []); }
    static set rooms(val) { this.set('rooms', val); }

    static get content() { return this.get('content', {}); }
    static set content(val) { this.set('content', val); }

    // Find user by email and password (for login)
    static authenticate(email, password) {
        const users = this.users;
        return users.find(u => u.email === email && u.password === password && u.status === 'Active') || null;
    }
    // Get all bookings for a specific customer
    static getBookingsByCustomer(customerId) {
        return this.bookings.filter(b => b.customerId === customerId || b.email === this.getUserById(customerId)?.email);
    }
    // Get all bookings for a specific hotel
    static getBookingsByHotel(hotelId) {
        return this.bookings.filter(b => b.hotelId === hotelId);
    }
    // Get rooms for a specific hotel
    static getRoomsByHotel(hotelId) {
        return this.rooms.filter(r => r.hotelId === hotelId);
    }
    // Get notifications for a specific user
    static getNotificationsByUser(userId, role) {
        return this.notifications.filter(n => n.recipientId === userId || n.recipientRole === role);
    }
        // Get user by ID
    static getUserById(id) {
        return this.users.find(u => u.id === id) || null;
    }
    // Get hotel by ID
    static getHotelById(id) {
        return this.hotels.find(h => h.id === id) || null;
    }
    // Get room by ID
    static getRoomById(id) {
        return this.rooms.find(r => r.id === id) || null;
    }
    // Update a booking field
    static updateBooking(bookingId, updates) {
        const bookings = this.bookings;
        const idx = bookings.findIndex(b => b.id === bookingId);
        if (idx !== -1) {
            bookings[idx] = { ...bookings[idx], ...updates, updatedAt: new Date().toISOString() };
            this.bookings = bookings;
            return bookings[idx];
        }
        return null;
    }
    // Update room status
    static updateRoomStatus(roomId, status) {
        const rooms = this.rooms;
        const idx = rooms.findIndex(r => r.id === roomId);
        if (idx !== -1) {
            rooms[idx].status = status;
            this.rooms = rooms;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getBookingLifecycle(booking)
    // Computes the real-time lifecycle stage of a booking using the user's
    // current LOCAL date/time.  Never relies on the stored b.status value
    // (which is a creation-time snapshot and never auto-updated).
    //
    // Returns:
    //   stage         – 'upcoming' | 'upcoming-locked' | 'active' |
    //                   'completed' | 'cancelled'
    //   displayStatus – human-readable label for the status badge
    //   badgeClass    – Bootstrap + custom CSS classes for the badge pill
    //   canModify     – true only when modification is allowed by policy
    //   canCancel     – true only when cancellation is allowed by policy
    //   isRefundable  – true when cancellation would qualify for a 90% refund
    // ─────────────────────────────────────────────────────────────────────────
    static getBookingLifecycle(booking) {
        // 1. Cancelled bookings always override date logic
        if (
            booking.status === 'Cancelled' ||
            booking.bookingStatus === 'Cancelled'
        ) {
            return {
                stage:         'cancelled',
                displayStatus: 'Cancelled',
                badgeClass:    'bg-danger text-white py-1 px-3 rounded-pill',
                canModify:     false,
                canCancel:     false,
                isRefundable:  false
            };
        }

        // 2. Parse check-in / check-out to LOCAL midnight Date objects.
        //    Supports both 'Jul 08, 2026' and '2026-07-08' / ISO formats.
        const parseLocalMidnight = (str) => {
            if (!str) return null;
            const d = new Date(str);
            if (isNaN(d.getTime())) return null;
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        };

        const checkInDay  = parseLocalMidnight(booking.checkIn);
        const checkOutDay = parseLocalMidnight(booking.checkOut);

        if (!checkInDay || !checkOutDay) {
            // Fallback: cannot determine — treat as upcoming with no actions
            return {
                stage:         'upcoming',
                displayStatus: 'Upcoming',
                badgeClass:    'bg-primary text-white py-1 px-3 rounded-pill',
                canModify:     false,
                canCancel:     false,
                isRefundable:  false
            };
        }

        // 3. Current local date/time
        const now   = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 4. Modification deadline = 24 h before check-in midnight
        //    (i.e. the day BEFORE check-in, same time)
        const modificationDeadlineMs = checkInDay.getTime() - (24 * 60 * 60 * 1000);

        // 5. Determine stage
        if (today >= checkOutDay) {
            // ── Completed ───────────────────────────────────────────────────
            return {
                stage:         'completed',
                displayStatus: 'Completed',
                badgeClass:    'bg-secondary text-white py-1 px-3 rounded-pill',
                canModify:     false,
                canCancel:     false,
                isRefundable:  false
            };
        }

        if (today >= checkInDay && today < checkOutDay) {
            // ── Stay in Hotel (active) ───────────────────────────────────────
            return {
                stage:         'active',
                displayStatus: 'Stay in Hotel',
                badgeClass:    'bg-success text-white py-1 px-3 rounded-pill',
                canModify:     false,
                canCancel:     false,
                isRefundable:  false
            };
        }

        // ── Upcoming ────────────────────────────────────────────────────────
        // Modification policy: allowed only if > 24 h before check-in
        const canModify = now.getTime() < modificationDeadlineMs;

        // Cancellation: allowed any time before check-in
        // Refund: 90% if cancelled more than 24 h before check-in
        const canCancel    = true;
        const isRefundable = now.getTime() < modificationDeadlineMs; // same 24 h window

        if (!canModify) {
            // Within 24-h lock window — still upcoming, but modification blocked
            return {
                stage:         'upcoming-locked',
                displayStatus: 'Upcoming',
                badgeClass:    'bg-warning text-dark py-1 px-3 rounded-pill',
                canModify:     false,
                canCancel:     true,
                isRefundable:  false  // within 24 h — no refund on cancel
            };
        }

        return {
            stage:         'upcoming',
            displayStatus: 'Upcoming',
            badgeClass:    'bg-primary text-white py-1 px-3 rounded-pill',
            canModify:     true,
            canCancel:     true,
            isRefundable:  true  // > 24 h before check-in — 90% refund eligible
        };
    }
}


window.HotelState = HotelState;
document.addEventListener('DOMContentLoaded', () => {
    HotelState.initDefaults();
});