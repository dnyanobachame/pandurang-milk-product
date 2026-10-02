'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type RegisterForm = {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
  addressLine: string;
  villageCity: string;
  taluka: string;
  district: string;
  pinCode: string;
  deliveryInstructions: string;
};

const INITIAL_FORM: RegisterForm = {
  fullName: '',
  mobile: '',
  email: '',
  password: '',
  addressLine: '',
  villageCity: '',
  taluka: '',
  district: 'Latur',
  pinCode: '',
  deliveryInstructions: '',
};

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(password)) {
    return 'Password must contain at least one special character.';
  }

  return null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeMobile(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

function normalizePinCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

function getSignupErrorMessage(
  message: string | undefined
): string {
  const msg = message?.toLowerCase() ?? '';

  if (
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  ) {
    return 'Too many registration attempts. Please wait a few minutes and try again.';
  }

  if (
    msg.includes('invalid email') ||
    msg.includes('email')
  ) {
    return 'Please enter a valid email address.';
  }

  if (
    msg.includes('password') &&
    (
      msg.includes('weak') ||
      msg.includes('short') ||
      msg.includes('length') ||
      msg.includes('minimum')
    )
  ) {
    return 'Please choose a stronger password.';
  }

  if (
    msg.includes('already registered') ||
    msg.includes('already exists')
  ) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  return 'Could not create your account. Please check your details and try again.';
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<RegisterForm>(INITIAL_FORM);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [awaitingConfirmation, setAwaitingConfirmation] =
    useState(false);

  function update<K extends keyof RegisterForm>(
    key: K,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    if (error) {
      setError(null);
    }
  }

  function validateForm(): string | null {
    const fullName = form.fullName.trim();
    const mobile = normalizeMobile(form.mobile);
    const email = normalizeEmail(form.email);
    const addressLine = form.addressLine.trim();
    const villageCity = form.villageCity.trim();
    const taluka = form.taluka.trim();
    const district = form.district.trim();
    const pinCode = normalizePinCode(form.pinCode);
    const deliveryInstructions =
      form.deliveryInstructions.trim();

    if (fullName.length < 2) {
      return 'Please enter your full name.';
    }

    if (fullName.length > 120) {
      return 'Full name is too long.';
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return 'Please enter a valid 10-digit Indian mobile number.';
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address.';
    }

    const passwordError =
      validatePassword(form.password);

    if (passwordError) {
      return passwordError;
    }

    if (addressLine.length < 3) {
      return 'Please enter your complete address.';
    }

    if (addressLine.length > 250) {
      return 'Address is too long.';
    }

    if (villageCity.length < 2) {
      return 'Please enter your village or city.';
    }

    if (villageCity.length > 100) {
      return 'Village / City name is too long.';
    }

    if (taluka.length > 100) {
      return 'Taluka name is too long.';
    }

    if (!district) {
      return 'District is required.';
    }

    if (district.length > 100) {
      return 'District name is too long.';
    }

    if (!/^\d{6}$/.test(pinCode)) {
      return 'PIN code must be exactly 6 digits.';
    }

    if (deliveryInstructions.length > 500) {
      return 'Delivery instructions are too long.';
    }

    return null;
  }

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError(null);

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const normalizedEmail =
      normalizeEmail(form.email);

    const normalizedMobile =
      normalizeMobile(form.mobile);

    const normalizedPinCode =
      normalizePinCode(form.pinCode);

    const fullName = form.fullName.trim();
    const addressLine = form.addressLine.trim();
    const villageCity = form.villageCity.trim();
    const taluka = form.taluka.trim();
    const district = form.district.trim();
    const deliveryInstructions =
      form.deliveryInstructions.trim();

    // ------------------------------------------------------------
    // 1. Create Supabase Auth account
    // ------------------------------------------------------------

    const {
      data: signUpData,
      error: signUpError,
    } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: form.password,
      options: {
        data: {
          full_name: fullName,
          mobile: normalizedMobile,
        },
      },
    });

    if (signUpError || !signUpData.user) {
      setLoading(false);

      setError(
        getSignupErrorMessage(signUpError?.message)
      );

      return;
    }

    // ------------------------------------------------------------
    // 2. Email-confirmation flow
    // ------------------------------------------------------------
    //
    // When Supabase requires email confirmation, there is no
    // authenticated session yet. We therefore must not attempt
    // to insert customer_addresses using the unauthenticated
    // browser client.
    //
    // The address is saved below only when an authenticated
    // session exists.
    // ------------------------------------------------------------

    if (!signUpData.session) {
      setLoading(false);
      setAwaitingConfirmation(true);
      return;
    }

    // ------------------------------------------------------------
    // 3. Save the first customer address
    // ------------------------------------------------------------

    const {
      error: addressError,
    } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: signUpData.user.id,
        address_line: addressLine,
        village_city: villageCity,
        taluka: taluka || null,
        district,
        pin_code: normalizedPinCode,
        delivery_instructions:
          deliveryInstructions || null,
        is_default: true,
      });

    setLoading(false);

    if (addressError) {
      console.error(
        'Registration address insert error:',
        addressError
      );

      /**
       * The Auth account was successfully created.
       * Do not pretend registration failed.
       *
       * Send the user to the address setup page so the
       * missing address can be completed.
       */
      router.replace(
        '/dashboard/addresses?setup=1'
      );

      router.refresh();

      return;
    }

    // ------------------------------------------------------------
    // 4. Registration completed
    // ------------------------------------------------------------

    router.replace('/dashboard');
    router.refresh();
  }

  if (awaitingConfirmation) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <div className="w-full max-w-sm bg-white rounded-xl2 shadow-sm border border-gray-100 p-8 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700"
            aria-hidden="true"
          >
            <span className="text-xl">✉</span>
          </div>

          <h1 className="text-xl font-semibold text-brand-700 mb-2">
            Check your email
          </h1>

          <p className="text-sm leading-6 text-gray-600 mb-6">
            Your account has been created. Please verify
            your email address before signing in.
          </p>

          <a
            href="/auth/login"
            className="inline-block w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 transition"
          >
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8 sm:px-6 sm:py-12 flex justify-center">
      <form
        onSubmit={handleRegister}
        noValidate
        className="w-full max-w-lg bg-white rounded-xl2 shadow-sm border border-gray-100 p-6 sm:p-8"
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Customer registration
          </p>

          <h1 className="mt-1 text-xl font-semibold text-brand-700">
            Create your account
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Order fresh milk and dairy, delivered to your door.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Full Name"
            value={form.fullName}
            onChange={(value) =>
              update('fullName', value)
            }
            required
            autoComplete="name"
            maxLength={120}
            span2
          />

          <Field
            label="Mobile Number"
            value={form.mobile}
            onChange={(value) =>
              update(
                'mobile',
                normalizeMobile(value)
              )
            }
            required
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
          />

          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) =>
              update('email', value)
            }
            required
            autoComplete="email"
            maxLength={254}
          />

          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(value) =>
              update('password', value)
            }
            required
            autoComplete="new-password"
            minLength={8}
            span2
          />

          <div className="sm:col-span-2 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-700">
              Password requirements
            </p>

            <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-500">
              <li>• At least 8 characters</li>
              <li>• One uppercase letter</li>
              <li>• One lowercase letter</li>
              <li>• One number</li>
              <li>• One special character</li>
            </ul>
          </div>

          <Field
            label="Address"
            value={form.addressLine}
            onChange={(value) =>
              update('addressLine', value)
            }
            required
            autoComplete="street-address"
            maxLength={250}
            span2
          />

          <Field
            label="Village / City"
            value={form.villageCity}
            onChange={(value) =>
              update('villageCity', value)
            }
            required
            autoComplete="address-level2"
            maxLength={100}
          />

          <Field
            label="Taluka"
            value={form.taluka}
            onChange={(value) =>
              update('taluka', value)
            }
            autoComplete="address-level3"
            maxLength={100}
          />

          <Field
            label="District"
            value={form.district}
            onChange={(value) =>
              update('district', value)
            }
            required
            autoComplete="address-level1"
            maxLength={100}
          />

          <Field
            label="PIN Code"
            value={form.pinCode}
            onChange={(value) =>
              update(
                'pinCode',
                normalizePinCode(value)
              )
            }
            required
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
          />

          <Field
            label="Delivery Instructions (optional)"
            value={form.deliveryInstructions}
            onChange={(value) =>
              update(
                'deliveryInstructions',
                value
              )
            }
            autoComplete="off"
            maxLength={500}
            span2
          />
        </div>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600 mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
        >
          {loading
            ? 'Creating account…'
            : 'Create Account'}
        </button>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account?{' '}
          <a
            href="/auth/login"
            className="text-brand-700 font-medium hover:text-brand-800"
          >
            Sign in
          </a>
        </p>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  span2 = false,
  autoComplete,
  inputMode,
  maxLength,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  span2?: boolean;
  autoComplete?: string;
  inputMode?:
    | 'none'
    | 'text'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search';
  maxLength?: number;
  minLength?: number;
}) {
  return (
    <label
      className={`block text-sm font-medium text-gray-800 ${
        span2 ? 'sm:col-span-2' : ''
      }`}
    >
      {label}

      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        minLength={minLength}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}