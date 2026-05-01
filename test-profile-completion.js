// Test profile completion logic for flat fee pricing
// Run this in browser console on musician profile page

// Test profile completion function
function testProfileCompletion() {
    console.log('Testing Profile Completion Logic for Flat Fee Pricing');
    console.log('='.repeat(60));
    
    // Test cases
    const testProfiles = [
        {
            name: 'Complete Hourly Musician',
            profile: {
                role: 'musician',
                full_name: 'John Doe',
                email: 'john@example.com',
                phone: '+233501234567',
                location: 'Accra, Ghana',
                bio: 'Professional musician',
                avatar_url: 'https://example.com/avatar.jpg',
                instruments: ['Guitar', 'Piano'],
                genres: ['Jazz', 'Blues'],
                pricing_model: 'hourly',
                hourly_rate: 150,
                base_price: null,
                bank_account_number: '1234567890',
                bank_code: 'GCB'
            }
        },
        {
            name: 'Complete Flat Fee Musician',
            profile: {
                role: 'musician',
                full_name: 'Jane Smith',
                email: 'jane@example.com',
                phone: '+233502345678',
                location: 'Kumasi, Ghana',
                bio: 'Professional musician',
                avatar_url: 'https://example.com/avatar.jpg',
                instruments: ['Vocals', 'Keyboard'],
                genres: ['Afrobeats', 'Highlife'],
                pricing_model: 'fixed',
                hourly_rate: null,
                base_price: 500,
                mobile_money_number: '+233502345678',
                mobile_money_provider: 'MTN'
            }
        },
        {
            name: 'Incomplete Flat Fee Musician (No Pricing)',
            profile: {
                role: 'musician',
                full_name: 'Bob Wilson',
                email: 'bob@example.com',
                phone: '+233503456789',
                location: 'Tamale, Ghana',
                bio: 'Professional musician',
                avatar_url: 'https://example.com/avatar.jpg',
                instruments: ['Drums'],
                genres: ['Rock'],
                pricing_model: 'fixed',
                hourly_rate: null,
                base_price: null, // Missing pricing
                bank_account_number: '1234567890',
                bank_code: 'GCB'
            }
        },
        {
            name: 'Legacy Flat Fee Musician (No Model Set)',
            profile: {
                role: 'musician',
                full_name: 'Alice Brown',
                email: 'alice@example.com',
                phone: '+233504567890',
                location: 'Cape Coast, Ghana',
                bio: 'Professional musician',
                avatar_url: 'https://example.com/avatar.jpg',
                instruments: ['Bass'],
                genres: ['Reggae'],
                pricing_model: null, // No model set
                hourly_rate: null,
                base_price: 400, // But has base price
                mobile_money_number: '+233504567890',
                mobile_money_provider: 'Vodafone'
            }
        }
    ];
    
    // Import the function (assuming it's available globally or can be imported)
    // If not available, copy the function here
    const calculateProfileCompletion = window.calculateProfileCompletion || function(profile) {
        if (!profile) {
            return { percentage: 0, missingFields: ['All fields'], isComplete: false };
        }
        
        const checks = [
            { label: 'Full Name', complete: !!(profile.full_name?.trim()) },
            { label: 'Email', complete: !!(profile.email?.trim()) },
            { label: 'Phone Number', complete: !!(profile.phone?.trim()) },
            { label: 'Location', complete: !!(profile.location?.trim()) },
            { label: 'Bio', complete: !!(profile.bio?.trim()) },
            { label: 'Profile Photo', complete: !!(profile.avatar_url?.trim()) },
        ];
        
        if (profile.role === 'musician') {
            // Check pricing based on pricing model
            const hasPricing = (() => {
                const pricingModel = profile.pricing_model;
                if (pricingModel === 'fixed') {
                    // For fixed pricing, check base_price
                    const basePrice = profile.base_price;
                    return typeof basePrice === 'number' ? basePrice > 0 : parseFloat(String(basePrice ?? 0)) > 0;
                } else {
                    // For hourly or no model specified, check hourly_rate (default behavior)
                    return typeof profile.hourly_rate === 'number' ? profile.hourly_rate > 0 : parseFloat(String(profile.hourly_rate ?? 0)) > 0;
                }
            })();
            
            checks.push(
                { label: 'Instruments', complete: Array.isArray(profile.instruments) && profile.instruments.length > 0 },
                { label: 'Genres', complete: Array.isArray(profile.genres) && profile.genres.length > 0 },
                { label: 'Pricing', complete: hasPricing },
                {
                    label: 'Payment Details',
                    complete: !!(
                        (profile.bank_account_number && profile.bank_code) ||
                        (profile.mobile_money_number && profile.mobile_money_provider)
                    ),
                }
            );
        } else {
            // Non-musicians get full score for musician-specific fields
            checks.push(
                { label: '', complete: true },
                { label: '', complete: true },
                { label: '', complete: true },
                { label: '', complete: true }
            );
        }
        
        const completedScore = checks.filter(c => c.complete).length;
        const totalFields = 10;
        const percentage = Math.round((completedScore / totalFields) * 100);
        const missingFields = checks.filter(c => !c.complete && c.label).map(c => c.label);
        
        return {
            percentage,
            missingFields,
            isComplete: percentage >= 80,
        };
    };
    
    // Test each profile
    testProfiles.forEach(test => {
        console.log(`\n${test.name}:`);
        console.log('-'.repeat(test.name.length + 1));
        
        const result = calculateProfileCompletion(test.profile);
        
        console.log(`Pricing Model: ${test.profile.pricing_model || 'null'}`);
        console.log(`Hourly Rate: ${test.profile.hourly_rate || 'null'}`);
        console.log(`Base Price: ${test.profile.base_price || 'null'}`);
        console.log(`Completion: ${result.percentage}%`);
        console.log(`Is Complete: ${result.isComplete}`);
        console.log(`Missing Fields: ${result.missingFields.join(', ') || 'None'}`);
        
        // Expected results
        const expected = {
            'Complete Hourly Musician': { percentage: 100, isComplete: true },
            'Complete Flat Fee Musician': { percentage: 100, isComplete: true },
            'Incomplete Flat Fee Musician (No Pricing)': { percentage: 90, isComplete: true }, // Missing pricing
            'Legacy Flat Fee Musician (No Model Set)': { percentage: 100, isComplete: true }
        };
        
        const exp = expected[test.name];
        if (exp) {
            const passed = result.percentage === exp.percentage && result.isComplete === exp.isComplete;
            console.log(`Expected: ${exp.percentage}%, Complete: ${exp.isComplete}`);
            console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
        }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('Test completed. Check results above.');
}

// Run the test
testProfileCompletion();