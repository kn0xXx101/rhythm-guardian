import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Guitar, MapPin, Star, LayoutGrid, List, ArrowUpDown, BadgeCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatGHSWithSymbol } from "@/lib/currency";
import { supabase } from "@/lib/supabase";
import { ReviewsDialog } from "@/components/musician/ReviewsDialog";
import { useNavigate, useLocation } from "react-router-dom";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { notificationsService } from "@/services/notificationsService";

interface Musician {
	id?: string;
	user_id?: string;
	full_name: string | null;
	instruments?: string[] | null;
	hourly_rate?: number | string | null;
	pricing_model?: 'hourly' | 'fixed' | null;
	base_price?: number | string | null;
	avatar_url?: string | null;
	rating?: number | string | null;
	location?: string | null;
	bio?: string | null;
	total_bookings?: number | null;
	available_days?: string[] | null;
}

const EVENT_TYPES = [
	'Performance',
	'Wedding',
	'Corporate Event',
	'Private Party',
	'Recording Session',
	'Teaching/Lesson',
	'Other',
];

interface BookingDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	musician: any;
	onConfirm: (details: any) => void;
}

const BookingDialog: React.FC<BookingDialogProps> = ({ open, onOpenChange, musician, onConfirm }) => {
	const [eventType, setEventType] = useState('Performance');
	const [eventDate, setEventDate] = useState('');
	const [startTime, setStartTime] = useState('18:00');
	const [endTime, setEndTime] = useState('22:00');
	const [location, setLocation] = useState('');
	const [notes, setNotes] = useState('');

	const calculateDuration = () => {
		if (!startTime || !endTime) return 0;
		const start = new Date(`2000-01-01T${startTime}`);
		const end = new Date(`2000-01-01T${endTime}`);
		let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
		if (diff < 0) diff += 24; // Handle overnight bookings
		return Math.max(0, diff);
	};

	const getEffectiveRate = (musician: Musician | null) => {
		if (!musician) return 0;
		
		// Check if musician has explicit pricing model
		if (musician.pricing_model === 'fixed' && musician.base_price) {
			return typeof musician.base_price === 'number' ? musician.base_price : parseFloat(String(musician.base_price || 0));
		}
		
		if (musician.pricing_model === 'hourly' && musician.hourly_rate) {
			return typeof musician.hourly_rate === 'number' ? musician.hourly_rate : parseFloat(String(musician.hourly_rate || 0));
		}
		
		// Fallback: if no pricing_model is set, prefer base_price over hourly_rate
		if (musician.base_price) {
			return typeof musician.base_price === 'number' ? musician.base_price : parseFloat(String(musician.base_price || 0));
		}
		
		if (musician.hourly_rate) {
			return typeof musician.hourly_rate === 'number' ? musician.hourly_rate : parseFloat(String(musician.hourly_rate || 0));
		}
		
		return 0;
	};

	const effectiveRate = getEffectiveRate(musician);
	
	// Determine if this is fixed pricing
	// Fixed pricing if: explicit pricing_model='fixed' OR has base_price but no pricing_model set
	const isFixedPricing = 
		musician?.pricing_model === 'fixed' || 
		(!musician?.pricing_model && !!musician?.base_price);
	
	const duration = calculateDuration();
	const totalBudget = isFixedPricing ? effectiveRate : effectiveRate * duration;

	const handleConfirm = () => {
		if (!eventDate || !startTime || !endTime || !location) {
			return;
		}
		onConfirm({
			eventType,
			eventDate,
			startTime,
			endTime,
			location,
			notes,
			duration,
			totalBudget,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>Book {musician?.full_name}</DialogTitle>
					<DialogDescription>
						Specify the details for your booking request.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4 overflow-y-auto">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="event-type">Event Type</Label>
							<Select value={eventType} onValueChange={setEventType}>
								<SelectTrigger id="event-type">
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									{EVENT_TYPES.map((type) => (
										<SelectItem key={type} value={type}>{type}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="event-date">Event Date</Label>
							<Input
								id="event-date"
								type="date"
								value={eventDate}
								onChange={(e) => setEventDate(e.target.value)}
								min={new Date().toISOString().split('T')[0]}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="start-time">Start Time</Label>
							<Input
								id="start-time"
								type="time"
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="end-time">End Time</Label>
							<Input
								id="end-time"
								type="time"
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="location">Location</Label>
						<Input
							id="location"
							placeholder="Enter event location"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="notes">Notes/Requirements</Label>
						<Textarea
							id="notes"
							placeholder="Any specific requirements for the musician?"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
						/>
					</div>
					<div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{isFixedPricing ? 'Fixed Rate:' : 'Hourly Rate:'}
							</span>
							<span className="font-medium">
								{isFixedPricing 
									? formatGHSWithSymbol(effectiveRate)
									: `${formatGHSWithSymbol(effectiveRate)}/hr`
								}
							</span>
						</div>
						{!isFixedPricing && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">Duration:</span>
								<span className="font-medium">{duration.toFixed(1)} hours</span>
							</div>
						)}
						<div className="flex justify-between text-base font-bold pt-2 border-t">
							<span>Total Estimated:</span>
							<span className="text-primary">{formatGHSWithSymbol(totalBudget)}</span>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={handleConfirm} disabled={!eventDate || !location || duration <= 0}>
						Confirm & Proceed to Payment
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const InstrumentalistSearch = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedInstrument, setSelectedInstrument] = useState<string>("all");
	const [selectedAvailability, setSelectedAvailability] = useState<string>("any");
	const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
	const [musicians, setMusicians] = useState<Musician[]>([]);
	const [filteredMusicians, setFilteredMusicians] = useState<Musician[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [showBookingDialog, setShowBookingDialog] = useState(false);
	const [selectedMusicianForBooking, setSelectedMusicianForBooking] = useState<Musician | null>(null);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [sortBy, setSortBy] = useState<string>('recommended');
	const [showReviewsDialog, setShowReviewsDialog] = useState(false);
	const [selectedMusicianForReviews, setSelectedMusicianForReviews] = useState<Musician | null>(null);

	const { toast } = useToast();
	const { user } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	// Initialize search from query param ?q=
	useEffect(() => {
		try {
			const params = new URLSearchParams(location.search);
			const q = params.get('q');
			if (q) {
				setSearchQuery(q);
			}
		} catch {
			// ignore malformed query
		}
		// only run on mount or when location.search changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.search]);

	// Fetch real musicians from Supabase
	useEffect(() => {
		const fetchMusicians = async () => {
			try {
				setIsLoading(true);
				const { data, error } = await supabase
					.from('profiles')
					.select(`
						*,
						total_reviews,
						rating
					`)
					.eq('role', 'musician')
					.eq('status', 'active')
					.order('rating', { ascending: false, nullsFirst: false });

				if (error) throw error;

				// Convert DECIMAL fields from string to number and normalize data
				const normalizedData = (data || []).map(musician => {
					const rawHourly = (musician as any).hourly_rate;
					const rawBase = (musician as any).base_price;
					const hourlyRate =
						rawHourly !== null && rawHourly !== undefined
							? parseFloat(String(rawHourly))
							: undefined;
					const basePrice =
						rawBase !== null && rawBase !== undefined
							? parseFloat(String(rawBase))
							: undefined;
					const rawMin = (musician as any).price_min;
					const rawMax = (musician as any).price_max;
					const priceMin =
						rawMin !== null && rawMin !== undefined ? parseFloat(String(rawMin)) : undefined;
					const priceMax =
						rawMax !== null && rawMax !== undefined ? parseFloat(String(rawMax)) : undefined;
					const pricingModel =
						(musician as any).pricing_model ||
						(basePrice !== undefined ? 'fixed' : hourlyRate !== undefined ? 'hourly' : undefined);

					// Debug rating values
					console.log('Musician rating debug:', {
						name: musician.full_name,
						rawRating: musician.rating,
						ratingType: typeof musician.rating,
						parsedRating: musician.rating ? parseFloat(String(musician.rating)) : null,
						condition: musician.rating && Number(musician.rating) > 0
					});

					return {
						...musician,
						id: musician.user_id,
						hourly_rate: Number.isFinite(hourlyRate) ? hourlyRate : undefined,
						base_price: Number.isFinite(basePrice) ? basePrice : undefined,
						price_min: Number.isFinite(priceMin) ? priceMin : undefined,
						price_max: Number.isFinite(priceMax) ? priceMax : undefined,
						pricing_model: pricingModel,
						rating: musician.rating && Number(musician.rating) > 0 ? parseFloat(String(musician.rating)) : null,
						total_reviews: musician.total_reviews || 0,
					};
				});

				setMusicians(normalizedData);
				setFilteredMusicians(normalizedData);
			} catch (error) {
				console.error('Error fetching musicians:', error);
				toast({
					variant: 'destructive',
					title: 'Error loading musicians',
					description: 'Failed to load musicians. Please try again.',
				});
				setMusicians([]);
				setFilteredMusicians([]);
			} finally {
				setIsLoading(false);
			}
		};

		fetchMusicians();
	}, [toast]);

	const handleSearch = useCallback(() => {
		const filtered = musicians.filter((musician) => {
			// Filter by search query (name or location)
			const matchesQuery =
				searchQuery === "" ||
				musician.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				musician.location?.toLowerCase().includes(searchQuery.toLowerCase());

			// Filter by instrument
			const matchesInstrument =
				selectedInstrument === "all" ||
				(musician.instruments && musician.instruments.length > 0 && musician.instruments.some(inst =>
					inst.toLowerCase() === selectedInstrument.toLowerCase()
				));

			// Filter by availability
			const matchesAvailability =
				selectedAvailability === "any" ||
				(selectedAvailability === "Weekends" &&
					musician.available_days && musician.available_days.some(day => ['Saturday', 'Sunday'].includes(day))) ||
				(selectedAvailability === "Weekdays" &&
					musician.available_days && musician.available_days.some(day => !['Saturday', 'Sunday'].includes(day))) ||
				selectedAvailability === "Flexible";

      // Filter by price range (handle both hourly and fixed pricing)
      const getEffectiveRate = (musician: Musician) => {
        if ((musician.pricing_model === 'fixed' || (!musician.pricing_model && musician.base_price)) && musician.base_price) {
          return typeof musician.base_price === 'number' ? musician.base_price : parseFloat(String(musician.base_price || 0));
        } else if (musician.hourly_rate) {
          return typeof musician.hourly_rate === 'number' ? musician.hourly_rate : parseFloat(String(musician.hourly_rate || 0));
        }
        return 0;
      };
      
      const effectiveRate = getEffectiveRate(musician);
      const minPrice = priceRange[0] ?? 0;
      const maxPrice = priceRange[1] ?? 1000;
      const matchesPrice = effectiveRate >= minPrice && effectiveRate <= maxPrice;

			return matchesQuery && matchesInstrument && matchesAvailability && matchesPrice;
		});

		// Sort results
		filtered.sort((a, b) => {
			const getEffectiveRate = (musician: Musician) => {
				if (musician.pricing_model === 'fixed' && musician.base_price) {
					return typeof musician.base_price === 'number' ? musician.base_price : parseFloat(String(musician.base_price || 0));
				} else if (musician.hourly_rate) {
					return typeof musician.hourly_rate === 'number' ? musician.hourly_rate : parseFloat(String(musician.hourly_rate || 0));
				}
				return 0;
			};
			
			const rateA = getEffectiveRate(a);
			const rateB = getEffectiveRate(b);
			const ratingA = typeof a.rating === 'number' ? a.rating : parseFloat(String(a.rating || 0));
			const ratingB = typeof b.rating === 'number' ? b.rating : parseFloat(String(b.rating || 0));

			switch (sortBy) {
				case 'price_low':
					return rateA - rateB;
				case 'price_high':
					return rateB - rateA;
				case 'rating':
					return ratingB - ratingA;
				case 'recommended':
				default:
					// Weighted sort: Rating has high priority, but randomized slightly for "recommended" feel or just rating
					return ratingB - ratingA;
			}
		});

		setFilteredMusicians(filtered);
	}, [musicians, searchQuery, selectedInstrument, selectedAvailability, priceRange, sortBy]);

	// Auto-search when filters change
	useEffect(() => {
		if (musicians.length > 0) {
			handleSearch();
		}
	}, [handleSearch, musicians.length]);

	const handleBookNow = (musician: Musician) => {
		// Check if user is logged in
		if (!user) {
			toast({
				variant: 'destructive',
				title: 'Please log in',
				description: 'You need to be logged in to book a musician.',
			});
			navigate('/login');
			return;
		}

		setSelectedMusicianForBooking(musician);
		setShowBookingDialog(true);
	};

	const handleConfirmBookingDetails = async (details: any) => {
		if (!user) return;
		try {
			setIsLoading(true);
			setShowBookingDialog(false);

			const musician = selectedMusicianForBooking;
			if (!musician) return;
			const musicianId = musician.id || musician.user_id;
			if (!musicianId) {
				throw new Error('Missing musician id for booking');
			}

			// Create booking in database
			const eventDateTime = details.eventDate && details.startTime
				? new Date(`${details.eventDate}T${details.startTime}`).toISOString()
				: details.eventDate;

			// Determine pricing type - prioritize explicit pricing_model, then base_price
			const isHourlyPricing = 
				musician.pricing_model === 'hourly' || 
				(!musician.pricing_model && !musician.base_price && musician.hourly_rate);
			const pricingType = isHourlyPricing ? 'hourly' : 'fixed';

			const insertPayload: any = {
				hirer_id: user.id,
				musician_id: musicianId,
				status: 'pending',
				payment_status: 'pending',
				event_type: details.eventType,
				event_date: eventDateTime,
				duration_hours: details.duration,
				location: details.location,
				total_amount: details.totalBudget,
				requirements: details.notes || `Booking request for ${musician.full_name}`,
				
				// Pricing type fields
				pricing_type: pricingType,
				hourly_rate: isHourlyPricing ? musician.hourly_rate : null,
				hours_booked: isHourlyPricing ? details.duration : null,
				base_amount: details.totalBudget,
			};

			const { data: newBooking, error: insertError } = await supabase
				.from('bookings')
				.insert(insertPayload)
				.select()
				.single();

			if (insertError) throw insertError;

			try {
				await notificationsService.createNotification({
					user_id: String(musicianId),
					type: 'booking',
					title: 'New booking request',
					message: `${user.full_name || user.email || 'A hirer'} sent a booking request.`,
					link: '/musician/bookings',
					is_read: false,
					priority: 'normal',
					data: { bookingId: newBooking.id },
				});
			} catch (error) {
				console.error('Failed to create notification:', error);
			}

			setShowBookingDialog(false);
			setSelectedMusicianForBooking(null);
			toast({
				title: 'Booking request sent',
				description:
					'The musician must accept before you can pay. You will pay from My Bookings after acceptance.',
			});
			navigate('/hirer/bookings');
		} catch (error) {
			console.error('Error creating booking:', error);
			toast({
				variant: 'destructive',
				title: 'Booking failed',
				description: (error as any)?.message || 'An unexpected error occurred.',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const getRateDisplay = (musician: Musician) => {
		const basePrice =
			typeof musician.base_price === 'number'
				? musician.base_price
				: musician.base_price !== undefined
					? parseFloat(String(musician.base_price))
					: undefined;
		const hourlyRate =
			typeof musician.hourly_rate === 'number'
				? musician.hourly_rate
				: musician.hourly_rate !== undefined
					? parseFloat(String(musician.hourly_rate))
					: undefined;
		const minPrice =
			typeof (musician as any).price_min === 'number'
				? (musician as any).price_min
				: (musician as any).price_min !== undefined
					? parseFloat(String((musician as any).price_min))
					: undefined;
		const maxPrice =
			typeof (musician as any).price_max === 'number'
				? (musician as any).price_max
				: (musician as any).price_max !== undefined
					? parseFloat(String((musician as any).price_max))
					: undefined;
		const hasBase = basePrice !== undefined && Number.isFinite(basePrice);
		const hasHourly = hourlyRate !== undefined && Number.isFinite(hourlyRate);
		const hasMin = minPrice !== undefined && Number.isFinite(minPrice);
		const hasMax = maxPrice !== undefined && Number.isFinite(maxPrice);

		if (hasBase) {
			return { amountText: `${formatGHSWithSymbol(basePrice)}`, labelText: 'flat fee' };
		}
		if (hasHourly) {
			return { amountText: `${formatGHSWithSymbol(hourlyRate)}`, labelText: 'per hour' };
		}
		if (hasMin && hasMax) {
			return {
				amountText: `${formatGHSWithSymbol(minPrice)} - ${formatGHSWithSymbol(maxPrice)}`,
				labelText: 'price range',
			};
		}
		if (hasMin) {
			return { amountText: `${formatGHSWithSymbol(minPrice)}`, labelText: 'price range' };
		}
		if (hasMax) {
			return { amountText: `${formatGHSWithSymbol(maxPrice)}`, labelText: 'price range' };
		}
		return { amountText: 'Rate on request', labelText: 'per hour' };
	};

	return (
		<div className="container mx-auto py-8 space-y-6 animate-fade-in">
        <DashboardHeader
          heading="Find Musicians"
          text="Search by instrument, availability, and location to find the right performer."
        />

        <Card variant="gradient-border" className="hover-scale">
				<CardHeader>
					<CardTitle>Search Filters</CardTitle>
					<CardDescription>Find the perfect musician for your event</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label htmlFor="search">Location or Name</Label>
							<Input
								id="search"
								placeholder="Search by location or name"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="instrument">Instrument</Label>
							<Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
								<SelectTrigger id="instrument">
									<SelectValue placeholder="Select instrument" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Instruments</SelectItem>
									<SelectItem value="Guitar">Guitar</SelectItem>
									<SelectItem value="Piano">Piano</SelectItem>
									<SelectItem value="Drums">Drums</SelectItem>
									<SelectItem value="Saxophone">Saxophone</SelectItem>
									<SelectItem value="Violin">Violin</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="availability">Availability</Label>
							<Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
								<SelectTrigger id="availability">
									<SelectValue placeholder="Select availability" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="any">Any Availability</SelectItem>
									<SelectItem value="Weekends">Weekends</SelectItem>
									<SelectItem value="Weekdays">Weekdays</SelectItem>
									<SelectItem value="Flexible">Flexible</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
            <Label>Price Range (₵): {formatGHSWithSymbol((priceRange[0] ?? 0))} - {formatGHSWithSymbol((priceRange[1] ?? 0))}</Label>
							<Slider
								defaultValue={[0, 1000]}
								max={1000}
								step={50}
								value={priceRange}
								onValueChange={setPriceRange}
								className="py-4"
							/>
						</div>
					</div>
				</CardContent>
				<CardFooter>
					<Button onClick={handleSearch} className="ml-auto">
						Apply Filters
					</Button>
				</CardFooter>
			</Card>

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="px-3 py-1">
						{filteredMusicians.length} {filteredMusicians.length === 1 ? 'result' : 'results'} found
					</Badge>
				</div>
				<div className="flex items-center gap-2 w-full sm:w-auto">
					<Select value={sortBy} onValueChange={setSortBy}>
						<SelectTrigger className="w-full sm:w-[180px]">
							<ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="recommended">Recommended</SelectItem>
							<SelectItem value="price_low">Price: Low to High</SelectItem>
							<SelectItem value="price_high">Price: High to Low</SelectItem>
							<SelectItem value="rating">Highest Rated</SelectItem>
						</SelectContent>
					</Select>

					<div className="border rounded-md flex p-1 bg-muted/20">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
										size="icon"
										className="h-9 w-9"
										onClick={() => setViewMode('grid')}
									>
										<LayoutGrid className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Grid View</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={viewMode === 'list' ? 'secondary' : 'ghost'}
										size="icon"
										className="h-9 w-9"
										onClick={() => setViewMode('list')}
									>
										<List className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>List View</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
			</div>

			<div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
				{isLoading ? (
					Array.from({ length: 6 }).map((_, i) => (
						<CardSkeleton key={i} className={viewMode === 'grid' ? "h-[400px]" : "h-[200px]"} />
					))
				) : filteredMusicians.length > 0 ? (
					filteredMusicians.map((musician) => (
						<Card 
							key={musician.id} 
							variant="gradient-border" 
							className={`card-enhanced overflow-hidden transition-all duration-300 group ${viewMode === 'grid' ? 'h-full flex flex-col' : 'flex flex-col md:flex-row'}`}
						>
							<div className={`relative overflow-hidden ${viewMode === 'grid' ? 'h-48 w-full' : 'h-48 md:h-full md:w-72 shrink-0'}`}>
								<OptimizedImage
									src={musician.avatar_url || 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg'}
									alt={musician.full_name || 'Musician'}
									className="h-full w-full object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-105"
									fallbackSrc="/placeholder.svg"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
								
								{/* Rating Badge */}
								{musician.rating && Number(musician.rating) > 0 ? (
									<div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-bold flex items-center gap-1.5 shadow-lg border-2 border-yellow-300">
										<Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
										<span className="text-gray-900">{Number(musician.rating).toFixed(1)}</span>
									</div>
								) : (
									<div className="absolute top-3 right-3 bg-blue-50/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-bold shadow-lg border-2 border-blue-200">
										<span className="text-blue-700">New</span>
									</div>
								)}
								
								{/* Verified Badge - only shown when admin has verified the musician's documents */}
								{(musician as any).documents_verified && (
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="absolute top-3 left-3 bg-primary text-primary-foreground backdrop-blur-sm rounded-full p-1.5 shadow-sm">
													<BadgeCheck className="h-4 w-4" />
												</div>
											</TooltipTrigger>
											<TooltipContent>Verified Musician</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}
							</div>
							
							<div className="flex-1 p-5 flex flex-col">
								{/* Header with name, location and price */}
								<div className="flex items-start justify-between mb-3">
									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors mb-1">
											{musician.full_name}
										</h3>
										<p className="text-sm text-muted-foreground flex items-center gap-1">
											<MapPin className="h-3.5 w-3.5 shrink-0" /> 
											<span className="truncate">{musician.location || 'Location not specified'}</span>
										</p>
									</div>
									<div className="text-right ml-3 shrink-0">
									{(() => {
										const rate = getRateDisplay(musician);
										return (
										<div className="bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
											<p className="font-bold text-base text-primary leading-none">
											{rate.amountText}
											</p>
											<p className="text-xs text-muted-foreground mt-1">
											{rate.labelText}
											</p>
										</div>
										);
									})()}
									</div>
								</div>

								{/* Instruments */}
								<div className="flex flex-wrap gap-2 mb-3">
									{musician.instruments?.slice(0, 2).map((instrument, idx) => (
										<Badge key={idx} variant="secondary" className="text-xs font-medium bg-secondary/80">
											<Guitar className="h-3 w-3 mr-1 opacity-70" /> {instrument}
										</Badge>
									))}
									{musician.instruments && musician.instruments.length > 2 && (
										<Badge variant="outline" className="text-xs font-medium">
											+{musician.instruments.length - 2} more
										</Badge>
									)}
								</div>
								
								{/* Bio */}
								<p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">
									{musician.bio || 'Professional musician ready to perform at your event. Experienced in various musical styles and committed to delivering exceptional performances.'}
								</p>

								{/* Footer with rating, bookings and buttons */}
								<div className="space-y-3 pt-3 border-t">
									<div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
										{musician.rating && Number(musician.rating) > 0 ? (
											<div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-200">
												<Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
												<span className="font-bold text-gray-900 text-sm">
													{Number(musician.rating).toFixed(1)}
												</span>
											</div>
										) : (
											<div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
												<Star className="h-4 w-4 text-gray-400" />
											</div>
										)}
										<span className="font-medium">{musician.total_bookings || 0} bookings</span>
									</div>
									<div className="flex gap-3 justify-center">
										<Button
											size="sm"
											variant="outline"
											className="gap-1 flex-1 max-w-[120px]"
											onClick={() => {
												setSelectedMusicianForReviews(musician);
												setShowReviewsDialog(true);
											}}
										>
											<Star className="h-3.5 w-3.5" />
											Reviews
										</Button>
										<Button
											size="sm"
											className="gap-2 flex-1 max-w-[120px] font-medium shadow-sm hover:shadow-md transition-all"
											onClick={() => handleBookNow(musician)}
										>
											Book Now
										</Button>
									</div>
								</div>
							</div>
						</Card>
					))
				) : (
					<div className="col-span-full py-16 text-center bg-muted/30 rounded-lg border border-dashed">
						<div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
							<Guitar className="h-8 w-8 text-muted-foreground/50" />
						</div>
						<h3 className="text-lg font-medium mb-2">No musicians found</h3>
						<p className="text-muted-foreground max-w-sm mx-auto mb-6">
							We couldn't find any musicians matching your specific criteria. Try adjusting your filters or search terms.
						</p>
						<Button 
							variant="outline" 
							onClick={() => {
								setSearchQuery("");
								setSelectedInstrument("all");
								setSelectedAvailability("any");
								setPriceRange([0, 1000]);
							}}
						>
							Clear All Filters
						</Button>
					</div>
				)}
			</div>

			{showBookingDialog && selectedMusicianForBooking && (
				<BookingDialog
					open={showBookingDialog}
					onOpenChange={setShowBookingDialog}
					musician={selectedMusicianForBooking}
					onConfirm={handleConfirmBookingDetails}
				/>
			)}

			{selectedMusicianForReviews && (
				<ReviewsDialog
					open={showReviewsDialog}
					onOpenChange={setShowReviewsDialog}
					musicianId={selectedMusicianForReviews.user_id || selectedMusicianForReviews.id || ''}
					musicianName={selectedMusicianForReviews.full_name || 'Musician'}
				/>
			)}
		</div>
	);
};

export default InstrumentalistSearch;
