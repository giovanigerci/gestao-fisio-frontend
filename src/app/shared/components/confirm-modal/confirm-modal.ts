import { Component, input, output } from '@angular/core';

export type ConfirmModalVariant = 'danger' | 'warning';

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
})
export class ConfirmModal {
  title = input('Confirmar ação');
  message = input('Deseja realmente continuar?');
  confirmLabel = input('Confirmar');
  cancelLabel = input('Voltar');
  variant = input<ConfirmModalVariant>('danger');
  loading = input(false);

  confirmed = output<void>();
  cancelled = output<void>();

  onOverlayClick() {
    if (!this.loading()) {
      this.cancelled.emit();
    }
  }
}
