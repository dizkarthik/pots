"use client";

import type { ReactNode } from "react";
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { CloseButton } from "@/components/base/buttons/close-button";
import { cx } from "@/utils/cx";

// BoardUI ships no generic modal, so this composes React Aria's primitives
// with BoardUI surface tokens. Focus is trapped and restored, Escape and an
// outside click dismiss.

export function Dialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-overlay-scrim p-4 pt-[10vh]"
    >
      <Modal
        className={cx(
          // Dark inputs share background-primary, so the dialog steps down a surface there.
          "w-full max-w-lg rounded-3xl border border-border-button-default bg-background-primary-default shadow-xl outline-none dark:bg-background-secondary-default",
          className,
        )}
      >
        <AriaDialog className="flex flex-col gap-5 p-6 outline-none">
          {({ close }) => (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Heading slot="title" className="text-title-3-semibold text-text-primary">
                    {title}
                  </Heading>
                  {description && <p className="text-body-regular text-text-secondary">{description}</p>}
                </div>
                <CloseButton aria-label="Close" onClick={close} />
              </div>
              {children}
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
