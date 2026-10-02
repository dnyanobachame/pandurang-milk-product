'use client';

import {
  useId,
  useState,
  useTransition,
} from 'react';

import {
  cancelAdminOrder,
  confirmAdminOrder,
  getAdminOrderDetails,
} from '@/app/actions/orders';

import {
  adminVerifyPayment,
} from '@/app/actions/payments';

type AdminOrderActionsProps = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  mobile: string | null;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
};

type OrderDetailsResponse = {
  order?: any;
  items?: any[];
  payment?: any;
  error?: string;
};

function formatStatus(
  value: string | null | undefined
) {
  return String(value ?? 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function formatMoney(
  value:
    | number
    | string
    | null
    | undefined
) {
  return `₹${Number(
    value ?? 0
  ).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return '—';

  return new Date(value).toLocaleString(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  );
}

function cleanPhone(
  phone: string | null | undefined
) {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (
    digits.startsWith('91') &&
    digits.length === 12
  ) {
    return digits;
  }

  return digits;
}

function getProductName(
  product: any
) {
  return (
    product?.name ??
    product?.name_marathi ??
    'Product'
  );
}

function AdminActionSpinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export default function AdminOrderActions({
  orderId,
  orderNumber,
  customerName,
  mobile,
  orderStatus,
  paymentStatus,
  paymentMethod,
}: AdminOrderActionsProps) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const detailsDialogTitleId = useId();
  const detailsDialogDescriptionId = useId();
  const verifyDialogTitleId = useId();
  const verifyDialogDescriptionId = useId();
  const cancelDialogTitleId = useId();

  const [
    detailsOpen,
    setDetailsOpen,
  ] = useState(false);

  const [
    cancelOpen,
    setCancelOpen,
  ] = useState(false);

  const [
    verifyOpen,
    setVerifyOpen,
  ] = useState(false);

  const [
    details,
    setDetails,
  ] =
    useState<OrderDetailsResponse | null>(
      null
    );

  const [
    verifyDetails,
    setVerifyDetails,
  ] =
    useState<OrderDetailsResponse | null>(
      null
    );

  const [
    copiedTransaction,
    setCopiedTransaction,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    cancelReason,
    setCancelReason,
  ] = useState('');

  const normalizedStatus =
    String(orderStatus);

  const normalizedPaymentStatus =
    String(paymentStatus);

  const normalizedPaymentMethod =
    String(paymentMethod);

  /*
   * COD orders can be confirmed
   * only while they are in "placed".
   */
  const canConfirm =
    normalizedStatus === 'placed' &&
    normalizedPaymentMethod === 'cod';

  /*
   * UPI payment can be manually verified
   * only after the customer has submitted
   * the transaction ID.
   */
  const canVerifyPayment =
    normalizedPaymentMethod === 'upi_qr' &&
    normalizedPaymentStatus ===
      'payment_submitted';

  /*
   * Do not allow cancellation of
   * terminal orders.
   */
  const canCancel =
    ![
      'cancelled',
      'delivered',
      'refunded',
    ].includes(normalizedStatus);

  const phoneNumber =
    cleanPhone(mobile);

  /*
   * ---------------------------------------------------------
   * VIEW DETAILS
   * ---------------------------------------------------------
   */

  function handleOpenDetails() {
    setError(null);
    setDetails(null);
    setDetailsOpen(true);

    startTransition(async () => {
      const result =
        await getAdminOrderDetails(
          orderId
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      setDetails(result);
    });
  }

  /*
   * ---------------------------------------------------------
   * OPEN VERIFY PAYMENT
   * ---------------------------------------------------------
   */

  function handleOpenVerifyPayment() {
    if (!canVerifyPayment) {
      setError(
        'This payment is not awaiting verification.'
      );
      return;
    }

    setError(null);
    setCopiedTransaction(false);
    setVerifyDetails(null);
    setVerifyOpen(true);

    startTransition(async () => {
      const result =
        await getAdminOrderDetails(
          orderId
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (
        result.payment?.status !==
        'payment_submitted'
      ) {
        setError(
          'This payment is no longer awaiting verification.'
        );
        return;
      }

      if (
        !result.payment?.transaction_id
      ) {
        setError(
          'Transaction ID is missing. The payment cannot be verified.'
        );
        return;
      }

      setVerifyDetails(result);
    });
  }

  /*
   * ---------------------------------------------------------
   * COPY TRANSACTION ID
   * ---------------------------------------------------------
   */

  async function handleCopyTransactionId() {
    const transactionId =
      verifyDetails?.payment
        ?.transaction_id;

    if (!transactionId) {
      setError(
        'Transaction ID is not available.'
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        String(transactionId)
      );

      setCopiedTransaction(true);
      setError(null);

      window.setTimeout(() => {
        setCopiedTransaction(false);
      }, 1800);
    } catch {
      setError(
        'Unable to copy the transaction ID. Please select and copy it manually.'
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * CONFIRM COD ORDER
   * ---------------------------------------------------------
   */

  function handleConfirm() {
    const confirmed =
      window.confirm(
        `Confirm order #${orderNumber} after speaking with the customer?`
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result =
        await confirmAdminOrder(
          orderId
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      window.location.reload();
    });
  }

  /*
   * ---------------------------------------------------------
   * VERIFY UPI PAYMENT
   * ---------------------------------------------------------
   */

  function handleVerifyPayment() {
    if (!canVerifyPayment) {
      setError(
        'This payment is not awaiting verification.'
      );
      return;
    }

    const transactionId =
      verifyDetails?.payment
        ?.transaction_id;

    if (!transactionId) {
      setError(
        'Transaction ID is missing. The payment cannot be verified.'
      );
      return;
    }

    setError(null);

    startTransition(async () => {
      const result =
        await adminVerifyPayment(
          orderId
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      setVerifyOpen(false);
      setVerifyDetails(null);
      setCopiedTransaction(false);

      /*
       * adminVerifyPayment() changes:
       *
       * payment.status = paid
       * order.payment_status = paid
       * order.order_status = confirmed
       *
       * Reload ensures the admin list/detail
       * immediately reflects the new state.
       */
      window.location.reload();
    });
  }

  /*
   * ---------------------------------------------------------
   * CANCEL ORDER
   * ---------------------------------------------------------
   */

  function handleCancel() {
    const reason =
      cancelReason.trim();

    if (!reason) {
      setError(
        'Please enter a cancellation reason.'
      );
      return;
    }

    setError(null);

    startTransition(async () => {
      const result =
        await cancelAdminOrder(
          orderId,
          reason
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      setCancelOpen(false);
      setCancelReason('');

      window.location.reload();
    });
  }

  /*
   * ---------------------------------------------------------
   * WHATSAPP
   * ---------------------------------------------------------
   */

  function openWhatsApp() {
    if (!phoneNumber) {
      setError(
        'Customer mobile number is not available.'
      );
      return;
    }

    const message =
      encodeURIComponent(
        `Hello ${customerName}, this is Pandurang Milk Product regarding your order #${orderNumber}.`
      );

    window.open(
      `https://wa.me/${phoneNumber}?text=${message}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  const verifyTransactionId =
    verifyDetails?.payment
      ?.transaction_id
      ? String(
          verifyDetails.payment
            .transaction_id
        )
      : '';

  const verifyAmount =
    verifyDetails?.payment?.amount ??
    verifyDetails?.order?.total ??
    0;

  return (
    <>
      {/* =====================================================
          ACTION BUTTONS
          ===================================================== */}

      <div className="flex flex-wrap gap-2">
        {phoneNumber ? (
          <a
            href={`tel:+${phoneNumber}`}
            aria-label={`Call ${customerName}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            📞 Call
          </a>
        ) : null}

        {phoneNumber ? (
          <button
            type="button"
            onClick={openWhatsApp}
            aria-label={`Open WhatsApp chat with ${customerName}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            💬 WhatsApp
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleOpenDetails}
          disabled={isPending}
          aria-busy={isPending}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && !detailsOpen ? (
            <>
              <AdminActionSpinner />
              <span>Loading...</span>
            </>
          ) : (
            'View Details'
          )}
        </button>

        {/* UPI PAYMENT VERIFICATION */}
        {canVerifyPayment ? (
          <button
            type="button"
            onClick={
              handleOpenVerifyPayment
            }
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ Verify Payment
          </button>
        ) : null}

        {/* COD CONFIRMATION */}
        {canConfirm ? (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <AdminActionSpinner />
                <span>Confirming...</span>
              </>
            ) : (
              '✓ Confirm'
            )}
          </button>
        ) : null}

        {canCancel ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCancelOpen(true);
            }}
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✕ Cancel
          </button>
        ) : null}
      </div>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error ? (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      ) : null}

      {/* =====================================================
          VERIFY PAYMENT MODAL
          ===================================================== */}

      {verifyOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={verifyDialogTitleId}
            aria-describedby={verifyDialogDescriptionId}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >

            {/* HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div>
                <h2 id={verifyDialogTitleId} className="text-lg font-semibold text-gray-900">
                  Verify UPI Payment
                </h2>

                <p id={verifyDialogDescriptionId} className="mt-1 text-sm text-gray-500">
                  Order #{orderNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isPending) {
                    setVerifyOpen(false);
                    setVerifyDetails(null);
                    setCopiedTransaction(false);
                  }
                }}
                disabled={isPending}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 py-2 text-gray-500 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:opacity-50"
                aria-label="Close payment verification"
              >
                ✕
              </button>
            </div>

            {isPending && !verifyDetails ? (
              <div className="p-10 text-center">
                <div className="text-sm font-medium text-gray-700">
                  Loading payment details...
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  Fetching transaction information.
                </div>
              </div>
            ) : verifyDetails?.payment ? (
              <>
                {/* PAYMENT STATUS */}
                <div className="mx-5 mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="text-xs font-medium text-blue-700">
                    Payment Status
                  </div>

                  <div className="mt-1 text-sm font-semibold text-blue-900">
                    Payment Submitted
                  </div>

                  <div className="mt-2 text-xs leading-5 text-blue-700">
                    The customer has submitted
                    this payment for manual
                    verification.
                  </div>
                </div>

                {/* TRANSACTION ID — PRIMARY */}
                <div className="mx-5 mt-4 rounded-xl border-2 border-blue-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Transaction ID
                      </div>

                      <div className="mt-1 text-xs text-gray-400">
                        Copy this ID to check the
                        payment in your UPI account.
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      REQUIRED
                    </span>
                  </div>

                  <div className="mt-3 flex items-stretch overflow-hidden rounded-xl border border-gray-300 bg-gray-50">
                    <div className="min-w-0 flex-1 overflow-x-auto px-3 py-3">
                      <code className="whitespace-nowrap font-mono text-base font-bold tracking-wide text-gray-900">
                        {verifyTransactionId}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleCopyTransactionId
                      }
                      disabled={
                        !verifyTransactionId ||
                        isPending
                      }
                      className="inline-flex min-h-[44px] shrink-0 items-center justify-center border-l border-gray-300 bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {copiedTransaction
                        ? '✓ Copied'
                        : 'Copy'}
                    </button>
                  </div>

                  {copiedTransaction ? (
                    <div
                      role="status"
                      className="mt-2 text-xs font-medium text-green-600"
                    >
                      Transaction ID copied to
                      clipboard.
                    </div>
                  ) : null}
                </div>

                {/* AMOUNT */}
                <div className="mx-5 mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">
                    Payment Amount
                  </div>

                  <div className="mt-1 text-2xl font-bold text-gray-900">
                    {formatMoney(
                      verifyAmount
                    )}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="mx-5 mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 p-3">
                    <div className="text-xs text-gray-500">
                      Customer
                    </div>

                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {verifyDetails
                        .order
                        ?.profiles
                        ?.full_name ??
                        customerName}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <div className="text-xs text-gray-500">
                      Payment Method
                    </div>

                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      UPI QR
                    </div>
                  </div>
                </div>

                {/* WARNING */}
                <div className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                  <div className="font-semibold">
                    Before verifying
                  </div>

                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    <li>
                      Copy the Transaction ID.
                    </li>

                    <li>
                      Check the transaction in
                      your UPI/payment account.
                    </li>

                    <li>
                      Confirm the received amount
                      matches{' '}
                      {formatMoney(
                        verifyAmount
                      )}
                      .
                    </li>

                    <li>
                      Only then click Verify &
                      Confirm Order.
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="text-sm font-semibold text-red-600">
                  Unable to load payment
                  details.
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  {error ??
                    'Please close this window and try again.'}
                </div>
              </div>
            )}

            {/* FOOTER */}
            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!isPending) {
                    setVerifyOpen(false);
                    setVerifyDetails(null);
                    setCopiedTransaction(false);
                  }
                }}
                disabled={isPending}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleVerifyPayment
                }
                disabled={
                  isPending ||
                  !verifyTransactionId ||
                  !verifyDetails?.payment
                }
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending
                  ? 'Verifying...'
                  : '✓ Verify & Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          CANCEL MODAL
          ===================================================== */}

      {cancelOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={cancelDialogTitleId}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={cancelDialogTitleId} className="text-lg font-semibold text-gray-900">
                  Cancel Order
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Order #{orderNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCancelOpen(false)
                }
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 py-2 text-gray-500 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
              >
                ✕
              </button>
            </div>

            <label
              htmlFor={`cancel-reason-${orderId}`}
              className="mt-5 block text-sm font-medium text-gray-700"
            >
              Cancellation reason
            </label>

            <textarea
              id={`cancel-reason-${orderId}`}
              value={cancelReason}
              onChange={(event) =>
                setCancelReason(
                  event.target.value
                )
              }
              rows={4}
              maxLength={500}
              placeholder="Example: Customer did not confirm the order by phone."
              className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none focus-visible:ring-2"
            />

            <div className="mt-1 text-right text-xs text-gray-400">
              {cancelReason.length}/500
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setCancelOpen(false);
                  setError(null);
                }}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
              >
                Keep Order
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending
                  ? 'Cancelling...'
                  : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          DETAILS MODAL
          ===================================================== */}

      {detailsOpen ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/50 p-3 backdrop-blur-[2px] sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={detailsDialogTitleId}
            aria-describedby={detailsDialogDescriptionId}
            className="mx-auto my-3 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-6"
          >

            {/* HEADER */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white p-4 sm:p-5">
              <div className="min-w-0">
                <h2 id={detailsDialogTitleId} className="truncate text-lg font-semibold text-gray-900 sm:text-xl">
                  Order #{orderNumber}
                </h2>

                <p id={detailsDialogDescriptionId} className="mt-1 text-sm text-gray-500">
                  Customer and order details
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetailsOpen(false)
                }
                className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg px-3 py-2 text-gray-500 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                aria-label="Close order details"
              >
                ✕
              </button>
            </div>

            {/* LOADING */}
            {isPending && !details ? (
              <div className="p-10 text-center text-sm text-gray-500" role="status" aria-live="polite">
                Loading order details...
              </div>
            ) : details?.order ? (
              <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">

                {/* CUSTOMER */}
                <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Customer
                      </h3>
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {formatStatus(
                        details.order.order_status
                      )}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-gray-500">
                        Name
                      </div>

                      <div className="mt-1 font-medium text-gray-900">
                        {details.order.profiles
                          ?.full_name ??
                          customerName}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Mobile
                      </div>

                      <div className="mt-1 font-medium text-gray-900">
                        {details.order.profiles
                          ?.mobile ??
                          mobile ??
                          'Not available'}
                      </div>
                    </div>

                    {details.order.profiles
                      ?.email ? (
                      <div className="sm:col-span-2">
                        <div className="text-xs text-gray-500">
                          Email
                        </div>

                        <div className="mt-1 break-all text-sm text-gray-900">
                          {
                            details.order
                              .profiles.email
                          }
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {phoneNumber ? (
                      <a
                        href={`tel:+${phoneNumber}`}
                        className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        📞 Call Customer
                      </a>
                    ) : null}

                    {phoneNumber ? (
                      <button
                        type="button"
                        onClick={openWhatsApp}
                        aria-label={`Open WhatsApp chat with ${customerName}`}
                        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        💬 WhatsApp
                      </button>
                    ) : null}
                  </div>
                </section>

                {/* ADDRESS */}
                <section className="rounded-xl border border-gray-100 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Delivery Address
                  </h3>

                  <div className="mt-3 text-sm leading-6 text-gray-700">
                    {details.order
                      .customer_addresses
                      ?.recipient_name ? (
                      <div className="font-medium text-gray-900">
                        {
                          details.order
                            .customer_addresses
                            .recipient_name
                        }
                      </div>
                    ) : null}

                    {details.order
                      .customer_addresses
                      ?.formatted_address ? (
                      <div className="mt-1">
                        {
                          details.order
                            .customer_addresses
                            .formatted_address
                        }
                      </div>
                    ) : (
                      <>
                        {details.order
                          .customer_addresses
                          ?.address_line ? (
                          <div>
                            {
                              details.order
                                .customer_addresses
                                .address_line
                            }
                          </div>
                        ) : null}

                        {details.order
                          .customer_addresses
                          ?.address_line_2 ? (
                          <div>
                            {
                              details.order
                                .customer_addresses
                                .address_line_2
                            }
                          </div>
                        ) : null}

                        {details.order
                          .customer_addresses
                          ?.village_city ? (
                          <div>
                            {
                              details.order
                                .customer_addresses
                                .village_city
                            }

                            {details.order
                              .customer_addresses
                              ?.taluka
                              ? `, ${details.order.customer_addresses.taluka}`
                              : ''}
                          </div>
                        ) : null}

                        {details.order
                          .customer_addresses
                          ?.district ? (
                          <div>
                            {
                              details.order
                                .customer_addresses
                                .district
                            }

                            {details.order
                              .customer_addresses
                              ?.state
                              ? `, ${details.order.customer_addresses.state}`
                              : ''}
                          </div>
                        ) : null}

                        {details.order
                          .customer_addresses
                          ?.pin_code ? (
                          <div>
                            PIN:{' '}
                            {
                              details.order
                                .customer_addresses
                                .pin_code
                            }
                          </div>
                        ) : null}
                      </>
                    )}

                    {details.order
                      .customer_addresses
                      ?.landmark ? (
                      <div className="mt-2">
                        <span className="font-medium">
                          Landmark:
                        </span>{' '}
                        {
                          details.order
                            .customer_addresses
                            .landmark
                        }
                      </div>
                    ) : null}

                    {details.order
                      .customer_addresses
                      ?.delivery_instructions ? (
                      <div className="mt-2 rounded-lg bg-amber-50 p-3 text-amber-800">
                        <span className="font-medium">
                          Delivery instructions:
                        </span>{' '}
                        {
                          details.order
                            .customer_addresses
                            .delivery_instructions
                        }
                      </div>
                    ) : null}
                  </div>
                </section>

                {/* PRODUCTS */}
                <section className="rounded-xl border border-gray-100 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Products
                  </h3>

                  <div className="mt-3 divide-y divide-gray-100">
                    {(details.items ?? []).map(
                      (item: any) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900">
                              {getProductName(
                                item.products
                              )}
                            </div>

                            {item.products
                              ?.name_marathi ? (
                              <div className="mt-0.5 text-xs text-gray-500">
                                {
                                  item.products
                                    .name_marathi
                                }
                              </div>
                            ) : null}

                            <div className="mt-1 text-xs text-gray-500">
                              Qty:{' '}
                              {item.quantity}{' '}
                              ×{' '}
                              {formatMoney(
                                item.unit_price
                              )}
                            </div>

                            {item.products
                              ?.net_quantity ? (
                              <div className="mt-1 text-xs text-gray-400">
                                {
                                  item.products
                                    .net_quantity
                                }{' '}
                                {
                                  item.products
                                    .unit
                                }
                              </div>
                            ) : null}
                          </div>

                          <div className="shrink-0 text-right font-semibold text-gray-900">
                            {formatMoney(
                              item.total
                            )}
                          </div>
                        </div>
                      )
                    )}

                    {(details.items ?? [])
                      .length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-500">
                        No products found.
                      </div>
                    ) : null}
                  </div>
                </section>

                {/* TOTAL */}
                <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">
                    Order Summary
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">
                        Subtotal
                      </span>

                      <span>
                        {formatMoney(
                          details.order.subtotal
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">
                        Discount
                      </span>

                      <span>
                        -
                        {formatMoney(
                          details.order.discount
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">
                        Delivery
                      </span>

                      <span>
                        {formatMoney(
                          details.order.delivery_fee
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">
                        Tax
                      </span>

                      <span>
                        {formatMoney(
                          details.order.tax
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
                      <span>Total</span>

                      <span>
                        {formatMoney(
                          details.order.total
                        )}
                      </span>
                    </div>
                  </div>
                </section>

                {/* STATUS */}
                <section className="rounded-xl border border-gray-100 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Order Status
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-gray-500">
                        Order
                      </div>

                      <div className="mt-1 font-medium text-gray-900">
                        {formatStatus(
                          details.order.order_status
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Payment
                      </div>

                      <div className="mt-1 font-medium text-gray-900">
                        {formatStatus(
                          details.payment?.status ??
                            details.order.payment_status
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Method
                      </div>

                      <div className="mt-1 font-medium text-gray-900">
                        {formatStatus(
                          details.payment?.payment_method ??
                            details.order.payment_method
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-gray-500">
                        Created
                      </div>

                      <div className="mt-1 text-sm text-gray-700">
                        {formatDate(
                          details.order.created_at
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Last Updated
                      </div>

                      <div className="mt-1 text-sm text-gray-700">
                        {formatDate(
                          details.order.updated_at
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* PAYMENT DETAILS */}
                <section className="rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Payment Details
                    </h3>

                    {details.payment?.status ===
                      'payment_submitted' ? (
                      <span className="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        Awaiting Verification
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-gray-500">
                        Amount
                      </div>

                      <div className="mt-1 font-semibold text-gray-900">
                        {formatMoney(
                          details.payment?.amount ??
                            details.order.total
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Transaction ID
                      </div>

                      <div className="mt-1 break-all rounded-lg bg-gray-50 p-2 font-mono text-sm text-gray-900">
                        {details.payment
                          ?.transaction_id ?? '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Verified At
                      </div>

                      <div className="mt-1 text-sm text-gray-900">
                        {formatDate(
                          details.payment?.verified_at
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Paid At
                      </div>

                      <div className="mt-1 text-sm text-gray-900">
                        {formatDate(
                          details.payment?.paid_at
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ACTIONS */}
                <div className="flex flex-col gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:flex-wrap">

                  {details.payment?.payment_method ===
                    'upi_qr' &&
                  details.payment?.status ===
                    'payment_submitted' ? (
                    <button
                      type="button"
                      onClick={
                        handleOpenVerifyPayment
                      }
                      disabled={isPending}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ✓ Verify & Confirm Payment
                    </button>
                  ) : null}

                  {canConfirm ? (
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={isPending}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending
                        ? 'Confirming...'
                        : '✓ Confirm Order'}
                    </button>
                  ) : null}

                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setCancelOpen(true);
                      }}
                      disabled={isPending}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ✕ Cancel Order
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setDetailsOpen(false)
                    }
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-red-600">
                {error ??
                  'Unable to load order details.'}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}