import { z } from 'zod';

export const ADDRESS_LABEL_PRESETS = ['Home', 'Office', 'Village Home', 'Farm', 'Other'] as const;

/** Shape of a customer_addresses row as the address pages use it. */
export type SavedAddress = {
  id: string;
  label: string | null;
  recipient_name: string | null;
  phone: string | null;
  address_line: string;
  address_line_2: string | null;
  landmark: string | null;
  village_city: string;
  taluka: string | null;
  district: string;
  state: string | null;
  pin_code: string;
  delivery_instructions: string | null;
  is_default: boolean;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const AddressInputSchema = z.object({
  label: z.string().trim().min(1, 'Please choose a label').max(30, 'Label is too long'),
  recipientName: z.string().trim().min(1, 'Recipient name is required').max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  addressLine: z.string().trim().min(1, 'House / street address is required').max(200),
  addressLine2: optionalText(200),
  landmark: optionalText(150),
  villageCity: z.string().trim().min(1, 'Village / city is required').max(100),
  taluka: optionalText(100),
  district: z.string().trim().min(1, 'District is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  pinCode: z.string().trim().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
  deliveryInstructions: optionalText(300),
  isDefault: z.boolean(),
});

export type AddressInput = z.input<typeof AddressInputSchema>;
