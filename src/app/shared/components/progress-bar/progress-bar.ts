import { Component, input, computed } from '@angular/core';

export interface ProgressSegment {
  value: number;
  color: string;
}

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.css',
})
export class ProgressBar {
  segments = input.required<ProgressSegment[]>();

  /** Altura em px. */
  height = input(6);

  normalizedSegments = computed(() => {
    const segs = this.segments();
    const total = segs.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return [];
    return segs.map(s => ({
      ...s,
      percent: (s.value / total) * 100,
    }));
  });
}
