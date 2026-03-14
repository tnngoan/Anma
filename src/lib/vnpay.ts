import crypto from 'crypto';

const VNPAY_SANDBOX_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNPAY_PRODUCTION_URL = 'https://pay.vnpay.vn/vpcpay.html';

function getVnpayConfig() {
  return {
    tmnCode: process.env.VNPAY_TMN_CODE!,
    hashSecret: process.env.VNPAY_HASH_SECRET!,
    paymentUrl: process.env.VNPAY_SANDBOX === 'true' ? VNPAY_SANDBOX_URL : VNPAY_PRODUCTION_URL,
    returnUrl: process.env.VNPAY_RETURN_URL!,
  };
}

function sortObject(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

export interface CreatePaymentUrlParams {
  amount: number; // in VND (not multiplied)
  bookingId: string;
  bookingNumber: string;
  ipAddr: string;
  locale?: 'vn' | 'en';
  bankCode?: string;
}

export function createPaymentUrl(params: CreatePaymentUrlParams): string {
  const config = getVnpayConfig();

  const now = new Date();
  // Format: yyyyMMddHHmmss in GMT+7
  const vnpCreateDate = formatVnpayDate(now);
  const expireDate = new Date(now.getTime() + 15 * 60 * 1000); // 15 min expiry
  const vnpExpireDate = formatVnpayDate(expireDate);

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(Math.round(params.amount * 100)),
    vnp_CreateDate: vnpCreateDate,
    vnp_CurrCode: 'VND',
    vnp_IpAddr: params.ipAddr,
    vnp_Locale: params.locale || 'vn',
    vnp_OrderInfo: `Thanh toan dat lich ${params.bookingNumber}`,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: config.returnUrl,
    vnp_TxnRef: params.bookingId,
    vnp_ExpireDate: vnpExpireDate,
  };

  if (params.bankCode) {
    vnpParams.vnp_BankCode = params.bankCode;
  }

  const sorted = sortObject(vnpParams);
  const signData = new URLSearchParams(sorted).toString();
  const hmac = crypto.createHmac('sha512', config.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  sorted.vnp_SecureHash = signed;

  return `${config.paymentUrl}?${new URLSearchParams(sorted).toString()}`;
}

export interface VnpayReturnParams {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_OrderInfo: string;
  vnp_PayDate?: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo?: string;
  vnp_TransactionStatus?: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
  [key: string]: string | undefined;
}

export function verifyReturnUrl(params: Record<string, string>): {
  isValid: boolean;
  isSuccess: boolean;
  bookingId: string;
  transactionNo: string | undefined;
  bankCode: string | undefined;
  amount: number;
  responseCode: string;
} {
  const config = getVnpayConfig();
  const secureHash = params.vnp_SecureHash;

  // Remove hash params before verifying
  const verifyParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && value) {
      verifyParams[key] = value;
    }
  }

  const sorted = sortObject(verifyParams);
  const signData = new URLSearchParams(sorted).toString();
  const hmac = crypto.createHmac('sha512', config.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  const isValid = signed === secureHash;
  const isSuccess = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';

  return {
    isValid,
    isSuccess,
    bookingId: params.vnp_TxnRef,
    transactionNo: params.vnp_TransactionNo,
    bankCode: params.vnp_BankCode,
    amount: parseInt(params.vnp_Amount || '0') / 100,
    responseCode: params.vnp_ResponseCode,
  };
}

export function getResponseMessage(code: string): string {
  const messages: Record<string, string> = {
    '00': 'Giao dich thanh cong',
    '07': 'Tru tien thanh cong nhung giao dich bi nghi ngo',
    '09': 'The/Tai khoan chua dang ky InternetBanking',
    '10': 'Xac thuc qua 3 lan',
    '11': 'Het han thanh toan',
    '12': 'The/Tai khoan bi khoa',
    '13': 'Nhap sai OTP',
    '24': 'Khach hang huy giao dich',
    '51': 'Tai khoan khong du so du',
    '65': 'Vuot qua han muc giao dich trong ngay',
    '75': 'Ngan hang dang bao tri',
    '79': 'Nhap sai mat khau thanh toan qua so lan',
    '99': 'Loi khong xac dinh',
  };
  return messages[code] || 'Loi khong xac dinh';
}

function formatVnpayDate(date: Date): string {
  // Convert to GMT+7
  const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const y = gmt7.getUTCFullYear();
  const m = String(gmt7.getUTCMonth() + 1).padStart(2, '0');
  const d = String(gmt7.getUTCDate()).padStart(2, '0');
  const h = String(gmt7.getUTCHours()).padStart(2, '0');
  const min = String(gmt7.getUTCMinutes()).padStart(2, '0');
  const s = String(gmt7.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}${s}`;
}
