"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Ruler } from 'lucide-react';
import styles from './SizeChartModal.module.css';

export interface SizeChartData {
  [sizeKey: string]: Record<string, string | number>;
}

export const DEFAULT_TOPS_SIZE_CHART: SizeChartData = {
  S: { length: 26, chest: 38, shoulder: 16 },
  M: { length: 27, chest: 40, shoulder: 17 },
  L: { length: 28, chest: 42, shoulder: 17.5 },
  XL: { length: 29, chest: 44, shoulder: 18 },
  XXL: { length: 30, chest: 46, shoulder: 18.5 },
};

export const DEFAULT_POLO_SIZE_CHART = DEFAULT_TOPS_SIZE_CHART;

export const DEFAULT_PANTS_SIZE_CHART: SizeChartData = {
  '28': { waist: 28, length: 39, hip: 37, inseam: 30 },
  '30': { waist: 30, length: 40, hip: 39, inseam: 30.5 },
  '32': { waist: 32, length: 40.5, hip: 41, inseam: 31 },
  '34': { waist: 34, length: 41, hip: 43, inseam: 31.5 },
  '36': { waist: 36, length: 41.5, hip: 45, inseam: 32 },
  '38': { waist: 38, length: 42, hip: 47, inseam: 32 },
};

interface SizeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeChartRaw?: string | SizeChartData | null;
  productName?: string;
  productType?: string | null;
  categoryName?: string | null;
}

export default function SizeChartModal({
  isOpen,
  onClose,
  sizeChartRaw,
  productName = "Product",
  productType,
  categoryName,
}: SizeChartModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeUnit, setActiveUnit] = useState<'in' | 'cm'>('in');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Determine if it's pants/bottoms based on name, category or productType
  const lowerName = (productName + ' ' + (productType || '') + ' ' + (categoryName || '')).toLowerCase();
  const isPants = lowerName.includes('pant') || lowerName.includes('jean') || lowerName.includes('trouser') || lowerName.includes('cargo') || lowerName.includes('jogger');

  // Parse size chart data or fallback to standard chart
  let chartData: SizeChartData = isPants ? DEFAULT_PANTS_SIZE_CHART : DEFAULT_TOPS_SIZE_CHART;
  if (sizeChartRaw) {
    if (typeof sizeChartRaw === 'string') {
      try {
        const parsed = JSON.parse(sizeChartRaw);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          chartData = parsed;
        }
      } catch (e) {
        chartData = isPants ? DEFAULT_PANTS_SIZE_CHART : DEFAULT_TOPS_SIZE_CHART;
      }
    } else if (typeof sizeChartRaw === 'object' && Object.keys(sizeChartRaw).length > 0) {
      chartData = sizeChartRaw;
    }
  }

  const sizeKeys = Object.keys(chartData);
  // Collect all column metric keys (e.g. length, chest, shoulder, waist, hip, etc.)
  const columnKeysSet = new Set<string>();
  sizeKeys.forEach((key) => {
    const row = chartData[key];
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => columnKeysSet.add(k));
    }
  });

  const columnKeys = Array.from(columnKeysSet);

  const formatValue = (val: string | number | undefined) => {
    if (val === undefined || val === null || val === '') return '-';
    if (typeof val === 'number') {
      if (activeUnit === 'cm') {
        return (val * 2.54).toFixed(1) + ' cm';
      }
      return `${val}"`;
    }
    const num = parseFloat(String(val));
    if (!isNaN(num)) {
      if (activeUnit === 'cm') {
        return (num * 2.54).toFixed(1) + ' cm';
      }
      return `${num}"`;
    }
    return String(val);
  };

  const portalContent = (
    <div className={styles.sideBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.sidePanel} onClick={(e) => e.stopPropagation()}>
        {/* Panel Header */}
        <div className={styles.panelHeader}>
          <div className={styles.headerTitleGroup}>
            <Ruler size={17} color="#F6D060" />
            <h3 className={styles.panelTitle}>SIZE GUIDE</h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close size guide"
          >
            <X size={19} />
          </button>
        </div>

        {/* Panel Content (Compact & Zero Scroll) */}
        <div className={styles.panelBody}>
          {/* Unit Toggle & Product Label */}
          <div className={styles.unitToggleRow}>
            <span className={styles.productLabelText}>
              Measurements for <strong style={{ color: '#111111' }}>{productName}</strong>
            </span>
            <div className={styles.unitPill}>
              <button
                type="button"
                onClick={() => setActiveUnit('in')}
                className={`${styles.unitBtn} ${activeUnit === 'in' ? styles.unitBtnActive : ''}`}
              >
                INCHES
              </button>
              <button
                type="button"
                onClick={() => setActiveUnit('cm')}
                className={`${styles.unitBtn} ${activeUnit === 'cm' ? styles.unitBtnActive : ''}`}
              >
                CM
              </button>
            </div>
          </div>

          {/* Graphical Diagram */}
          <div className={styles.illustrationWrap}>
            {isPants ? (
              <svg
                className={styles.svgDiagram}
                viewBox="0 0 360 250"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Pants outline */}
                <path
                  d="M 120 35 L 240 35 L 250 85 L 235 235 L 190 235 L 180 115 L 170 235 L 125 235 L 110 85 Z"
                  fill="#F9FAFB"
                  stroke="#222222"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                {/* Waistband stitch */}
                <line x1="117" y1="50" x2="243" y2="50" stroke="#222222" strokeWidth="1.5" strokeDasharray="3 2" />
                
                {/* 1. WAIST LINE */}
                <g>
                  <line x1="110" y1="24" x2="250" y2="24" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="110" y1="16" x2="110" y2="32" stroke="#DC2626" strokeWidth="2" />
                  <line x1="250" y1="16" x2="250" y2="32" stroke="#DC2626" strokeWidth="2" />
                  <rect x="155" y="14" width="50" height="17" rx="3" fill="#DC2626" />
                  <text x="180" y="26" fill="#ffffff" fontSize="8.5" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">
                    WAIST
                  </text>
                </g>

                {/* 2. HIP LINE */}
                <g>
                  <line x1="108" y1="90" x2="252" y2="90" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="108" y1="83" x2="108" y2="97" stroke="#DC2626" strokeWidth="2" />
                  <line x1="252" y1="83" x2="252" y2="97" stroke="#DC2626" strokeWidth="2" />
                  <rect x="160" y="81" width="40" height="17" rx="3" fill="#DC2626" />
                  <text x="180" y="93" fill="#ffffff" fontSize="8.5" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">
                    HIP
                  </text>
                </g>

                {/* 3. LENGTH LINE */}
                <g>
                  <line x1="90" y1="35" x2="90" y2="235" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="82" y1="35" x2="98" y2="35" stroke="#DC2626" strokeWidth="2" />
                  <line x1="82" y1="235" x2="98" y2="235" stroke="#DC2626" strokeWidth="2" />
                  <rect x="15" y="125" width="55" height="17" rx="3" fill="#DC2626" />
                  <text x="42.5" y="137" fill="#ffffff" fontSize="8.5" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">
                    LENGTH
                  </text>
                  <line x1="70" y1="133" x2="90" y2="133" stroke="#DC2626" strokeWidth="1.5" />
                </g>
              </svg>
            ) : (
              <svg
                className={styles.svgDiagram}
                viewBox="0 0 400 270"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Shirt Outline */}
                <path
                  d="M 130 35 L 160 35 C 170 55 230 55 240 35 L 270 35 L 330 75 L 305 115 L 275 100 L 275 245 L 125 245 L 125 100 L 95 115 L 70 75 Z"
                  fill="#F9FAFB"
                  stroke="#222222"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                {/* Collar */}
                <path d="M 160 35 C 175 60 225 60 240 35" stroke="#222222" strokeWidth="1.8" fill="none" />
                <path d="M 200 52 L 200 110" stroke="#222222" strokeWidth="1.8" />

                {/* 1. SHOULDER */}
                <g>
                  <line x1="130" y1="22" x2="270" y2="22" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="130" y1="14" x2="130" y2="30" stroke="#DC2626" strokeWidth="2" />
                  <line x1="270" y1="14" x2="270" y2="30" stroke="#DC2626" strokeWidth="2" />
                  <rect x="165" y="13" width="70" height="17" rx="3" fill="#DC2626" />
                  <text x="200" y="25" fill="#ffffff" fontSize="8.5" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">
                    SHOULDER
                  </text>
                </g>

                {/* 2. CHEST */}
                <g>
                  <line x1="125" y1="125" x2="275" y2="125" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="125" y1="117" x2="125" y2="133" stroke="#DC2626" strokeWidth="2" />
                  <line x1="275" y1="117" x2="275" y2="133" stroke="#DC2626" strokeWidth="2" />
                  <rect x="175" y="116" width="50" height="17" rx="3" fill="#DC2626" />
                  <text x="200" y="128" fill="#ffffff" fontSize="8.5" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">
                    CHEST
                  </text>
                </g>

                {/* 3. LENGTH */}
                <g>
                  <line x1="108" y1="35" x2="108" y2="245" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />
                  <line x1="100" y1="35" x2="116" y2="35" stroke="#DC2626" strokeWidth="2" />
                  <line x1="100" y1="245" x2="116" y2="245" stroke="#DC2626" strokeWidth="2" />
                  <rect x="25" y="130" width="55" height="17" rx="3" fill="#DC2626" />
                  <text x="52.5" y="142" fill="#ffffff" fontSize="8.5" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">
                    LENGTH
                  </text>
                  <line x1="80" y1="138" x2="108" y2="138" stroke="#DC2626" strokeWidth="1.5" />
                </g>
              </svg>
            )}
          </div>

          {/* Quick measurement guide notes */}
          <div className={styles.measurementNotes}>
            {isPants ? (
              <>
                <div className={styles.noteItem}>
                  <strong>WAIST</strong>
                  <span>Natural waistline</span>
                </div>
                <div className={styles.noteItem}>
                  <strong>HIP</strong>
                  <span>Fullest part of hips</span>
                </div>
                <div className={styles.noteItem}>
                  <strong>LENGTH</strong>
                  <span>Waist seam to bottom hem</span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.noteItem}>
                  <strong>LENGTH</strong>
                  <span>Shoulder to bottom hem</span>
                </div>
                <div className={styles.noteItem}>
                  <strong>CHEST</strong>
                  <span>Armpit to armpit</span>
                </div>
                <div className={styles.noteItem}>
                  <strong>SHOULDER</strong>
                  <span>Seam to seam across back</span>
                </div>
              </>
            )}
          </div>

          {/* Measurement Table */}
          <div className={styles.tableContainer}>
            <table className={styles.sizeTable}>
              <thead>
                <tr>
                  <th>SIZE</th>
                  {columnKeys.map((col) => (
                    <th key={col}>{col.toUpperCase()} ({activeUnit.toUpperCase()})</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeKeys.map((sizeKey) => {
                  const rowData = chartData[sizeKey] || {};
                  return (
                    <tr key={sizeKey}>
                      <td>
                        <span className={styles.sizeLabel}>{sizeKey}</span>
                      </td>
                      {columnKeys.map((col) => (
                        <td key={col}>{formatValue(rowData[col])}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Note */}
          <div className={styles.panelFooter}>
            Measurements are tailored for Indian sizing. For a relaxed or oversized fit, choose one size up.
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(portalContent, document.body);
}
