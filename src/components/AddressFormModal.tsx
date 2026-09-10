"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Home, Building, MapPin, AlertCircle, Truck } from 'lucide-react';
import styles from './AddressFormModal.module.css';
import {
  getStatesList,
  getDistrictsForState,
  getLocationsForDistrict,
  getPincodesForLocation,
  checkPinDeliverability,
  lookupPincode,
} from '@/data/indiaLocations';

export interface SavedAddressData {
  id?: string;
  full_name: string;
  phone: string;
  address: string;
  area?: string | null;
  district?: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
  is_default?: boolean;
}

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedAddress: SavedAddressData) => void;
  initialData?: SavedAddressData | null;
}

export default function AddressFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: AddressFormModalProps) {
  const allStates = useMemo(() => getStatesList(), []);

  const [tag, setTag] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [flatBuilding, setFlatBuilding] = useState('');
  const [areaStreet, setAreaStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [state, setState] = useState('Uttar Pradesh');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Initialize or reset form data
  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        setFullName(initialData.full_name || '');
        setPhone(initialData.phone || '');
        setFlatBuilding(initialData.address || '');
        setAreaStreet(initialData.area || '');
        setLandmark(initialData.landmark || '');

        const targetState = initialData.state && allStates.includes(initialData.state) ? initialData.state : (allStates[0] || 'Uttar Pradesh');
        setState(targetState);

        const districts = getDistrictsForState(targetState);
        const targetDistrict = initialData.district && districts.includes(initialData.district) ? initialData.district : (districts[0] || '');
        setDistrict(targetDistrict);

        const locations = getLocationsForDistrict(targetState, targetDistrict);
        const targetCity = initialData.city && locations.some(l => l.locationName.toLowerCase() === initialData.city?.toLowerCase())
          ? initialData.city
          : (locations[0]?.locationName || '');
        setCity(targetCity);

        setPincode(initialData.pincode || '');
        setIsDefault(Boolean(initialData.is_default));

        // Parse tag from landmark or default
        if (initialData.landmark?.toLowerCase().includes('office')) {
          setTag('Office');
        } else if (initialData.landmark?.toLowerCase().includes('other')) {
          setTag('Other');
        } else {
          setTag('Home');
        }
      } else {
        // Defaults for new address
        setFullName('');
        setPhone('');
        setFlatBuilding('');
        setAreaStreet('');
        setLandmark('');
        setTag('Home');

        const defaultState = allStates.includes('Uttar Pradesh') ? 'Uttar Pradesh' : (allStates[0] || '');
        setState(defaultState);
        const districts = getDistrictsForState(defaultState);
        const defaultDistrict = districts[0] || '';
        setDistrict(defaultDistrict);
        const locations = getLocationsForDistrict(defaultState, defaultDistrict);
        const defaultCity = locations[0]?.locationName || '';
        setCity(defaultCity);
        const pins = locations[0]?.pincodes || [];
        setPincode(pins[0] || '');
        setIsDefault(false);
      }
    }
  }, [isOpen, initialData, allStates]);

  const availableDistricts = useMemo(() => getDistrictsForState(state), [state]);
  const availableLocations = useMemo(() => getLocationsForDistrict(state, district), [state, district]);
  const availablePincodes = useMemo(() => getPincodesForLocation(state, district, city), [state, district, city]);
  const deliverability = useMemo(() => checkPinDeliverability(pincode, state, district, city), [pincode, state, district, city]);

  const handleStateChange = (newState: string) => {
    setState(newState);
    const districts = getDistrictsForState(newState);
    const firstDist = districts[0] || '';
    setDistrict(firstDist);
    const locs = getLocationsForDistrict(newState, firstDist);
    const firstLoc = locs[0]?.locationName || '';
    setCity(firstLoc);
    const pins = locs[0]?.pincodes || [];
    setPincode(pins[0] || '');
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const locs = getLocationsForDistrict(state, newDistrict);
    const firstLoc = locs[0]?.locationName || '';
    setCity(firstLoc);
    const pins = locs[0]?.pincodes || [];
    setPincode(pins[0] || '');
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const pins = getPincodesForLocation(state, district, newCity);
    setPincode(pins[0] || '');
  };

  const handlePincodeChange = (pin: string) => {
    const clean = pin.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);

    if (clean.length === 6) {
      const match = lookupPincode(clean);
      if (match && allStates.includes(match.state)) {
        setState(match.state);
        setDistrict(match.district);
        setCity(match.location);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = fullName.trim();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const trimmedFlat = flatBuilding.trim();
    const trimmedArea = areaStreet.trim();
    const trimmedLandmark = landmark.trim();
    const cleanPin = pincode.trim().replace(/\D/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter recipient full name (at least 2 characters).');
      return;
    }
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!trimmedFlat || trimmedFlat.length < 3) {
      setError('Please enter house/flat/building details.');
      return;
    }
    if (!trimmedArea) {
      setError('Please enter area, street, or sector.');
      return;
    }
    if (!state || !city) {
      setError('Please select state and city.');
      return;
    }
    if (cleanPin.length !== 6) {
      setError('PIN code must be 6 numeric digits.');
      return;
    }
    if (!deliverability.deliverable) {
      setError(deliverability.courierMessage || deliverability.reason || 'We do not currently deliver to this PIN code.');
      return;
    }

    setLoading(true);
    try {
      const isEdit = Boolean(initialData?.id);
      const endpoint = '/api/customer/addresses';
      const method = isEdit ? 'PUT' : 'POST';

      const landmarkWithTag = trimmedLandmark ? `${tag} • ${trimmedLandmark}` : tag;

      const payload = {
        ...(isEdit ? { id: initialData?.id } : {}),
        full_name: trimmedName,
        phone: cleanPhone,
        address: trimmedFlat,
        area: trimmedArea,
        district: district,
        city: city,
        state: state,
        pincode: cleanPin,
        landmark: landmarkWithTag,
        is_default: isDefault,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save address.');
      }

      onSuccess(data.address);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving address.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {initialData?.id ? 'Edit Delivery Address' : 'Add New Delivery Address'}
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Address Type Tag */}
            <div className={styles.tagGroup}>
              <button
                type="button"
                className={`${styles.tagBtn} ${tag === 'Home' ? styles.tagBtnActive : ''}`}
                onClick={() => setTag('Home')}
              >
                <Home size={14} />
                <span>Home</span>
              </button>
              <button
                type="button"
                className={`${styles.tagBtn} ${tag === 'Office' ? styles.tagBtnActive : ''}`}
                onClick={() => setTag('Office')}
              >
                <Building size={14} />
                <span>Office / Work</span>
              </button>
              <button
                type="button"
                className={`${styles.tagBtn} ${tag === 'Other' ? styles.tagBtnActive : ''}`}
                onClick={() => setTag('Other')}
              >
                <MapPin size={14} />
                <span>Other</span>
              </button>
            </div>

            {/* Recipient details */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Recipient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shivansh Narain"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>10-Digit Mobile Number *</label>
                <div className={styles.phoneInputWrapper}>
                  <span className={styles.phonePrefix}>+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={styles.phoneInput}
                  />
                </div>
              </div>
            </div>

            {/* Address fields */}
            <div className={styles.formGrid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>House / Flat / Building *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Sunshine Heights"
                  value={flatBuilding}
                  onChange={e => setFlatBuilding(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Area / Street / Sector *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Linking Road, Bandra West"
                  value={areaStreet}
                  onChange={e => setAreaStreet(e.target.value)}
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Landmark (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Opposite Metro Station / Near National College"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                className={styles.formInput}
              />
            </div>

            {/* Cascading State -> District -> City -> PIN */}
            <div className={styles.formGrid4}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>State / UT *</label>
                <select
                  value={state}
                  onChange={e => handleStateChange(e.target.value)}
                  className={styles.formSelect}
                >
                  {allStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>District *</label>
                <select
                  value={district}
                  onChange={e => handleDistrictChange(e.target.value)}
                  className={styles.formSelect}
                >
                  {availableDistricts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>City / Location *</label>
                <select
                  value={city}
                  onChange={e => handleCityChange(e.target.value)}
                  className={styles.formSelect}
                >
                  {availableLocations.map(loc => (
                    <option key={loc.locationName} value={loc.locationName}>{loc.locationName}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Postal PIN *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={pincode}
                  onChange={e => handlePincodeChange(e.target.value)}
                  className={styles.formInput}
                />
                {availablePincodes.length > 1 && (
                  <div className={styles.pinChips}>
                    {availablePincodes.slice(0, 3).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePincodeChange(p)}
                        className={`${styles.pinChip} ${pincode === p ? styles.pinChipActive : ''}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Courier deliverability badge */}
            <div style={{ marginTop: '0.25rem', marginBottom: '0.85rem' }}>
              {deliverability.deliverable ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                  <Truck size={14} />
                  <span>✓ {deliverability.courierMessage}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                  <AlertCircle size={14} />
                  <span>{deliverability.courierMessage || deliverability.reason}</span>
                </div>
              )}
            </div>

            {/* Default Address Checkbox */}
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                className={styles.checkboxInput}
              />
              <span>Make this my default delivery address</span>
            </label>
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !deliverability.deliverable}
            >
              {loading ? 'Saving...' : initialData?.id ? 'Save Changes' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
