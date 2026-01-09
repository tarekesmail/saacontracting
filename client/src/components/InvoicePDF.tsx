import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register Noto Naskh Arabic font from Google Fonts (allowed by CSP)
Font.register({
  family: 'Noto Naskh Arabic',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notonaskharabic/v33/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwvc5krK0z9_Mnuw.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/notonaskharabic/v33/RrQ5bpV-9Dd1b1OAGA6M9PkyDuVBePeKNaxcsss0Y7bwj89krK0z9_Mnuw.ttf',
      fontWeight: 700,
    },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center',
    marginBottom: 15,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  companyArabic: {
    fontSize: 12,
    fontFamily: 'Noto Naskh Arabic',
    color: '#2d5a87',
    marginBottom: 6,
    textAlign: 'center',
  },
  companyInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    fontSize: 9,
    color: '#4a5568',
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
    marginVertical: 12,
  },
  invoiceTitle: {
    textAlign: 'center',
    marginBottom: 15,
  },
  invoiceTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  invoiceTitleArabic: {
    fontSize: 14,
    fontFamily: 'Noto Naskh Arabic',
    color: '#2d5a87',
    textAlign: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  billToSection: {
    flex: 1,
    paddingRight: 20,
  },
  invoiceInfoSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detailLine: {
    fontSize: 9,
    marginBottom: 3,
    color: '#4a5568',
  },
  detailLineArabic: {
    fontSize: 9,
    marginBottom: 3,
    color: '#4a5568',
    fontFamily: 'Noto Naskh Arabic',
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  qrCode: {
    width: 100,
    height: 100,
    marginTop: 10,
    border: '1px solid #e2e8f0',
    borderRadius: 4,
  },
  table: {
    marginVertical: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableHeaderArabic: {
    fontSize: 7,
    fontFamily: 'Noto Naskh Arabic',
    color: '#b8d4f0',
    marginTop: 2,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowEven: {
    backgroundColor: '#f7fafc',
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
    color: '#2d3748',
  },
  tableCellCenter: {
    textAlign: 'center',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#edf2f7',
    borderTopWidth: 2,
    borderTopColor: '#1e3a5f',
  },
  totalCell: {
    padding: 6,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 12,
  },
  netAmount: {
    backgroundColor: '#1e3a5f',
    padding: 10,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  netAmountLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  netAmountValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  amountWords: {
    backgroundColor: '#f7fafc',
    borderLeftWidth: 4,
    borderLeftColor: '#1e3a5f',
    padding: 8,
    marginVertical: 12,
    borderRadius: 4,
  },
  amountWordsText: {
    fontSize: 9,
    color: '#4a5568',
  },
  amountWordsLabel: {
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  bankDetails: {
    backgroundColor: '#f7fafc',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 15,
  },
  bankDetailsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  bankDetailsText: {
    fontSize: 9,
    color: '#4a5568',
    marginBottom: 2,
  },
  bankDetailsArabic: {
    fontFamily: 'Noto Naskh Arabic',
  },
  // Column widths
  colNum: { width: '5%' },
  colDesc: { width: '30%' },
  colQty: { width: '10%' },
  colRate: { width: '12%' },
  colAmount: { width: '15%' },
  colTax: { width: '13%' },
  colTotal: { width: '15%' },
});

// Number to words function
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Million', 'Billion'];

  if (num === 0) return 'Zero Saudi Riyals Only';

  const convert = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
    
    for (let i = 0; i < thousands.length; i++) {
      const unit = Math.pow(1000, i + 1);
      if (n < unit) {
        const quotient = Math.floor(n / Math.pow(1000, i));
        const remainder = n % Math.pow(1000, i);
        return convert(quotient) + ' ' + thousands[i] + (remainder !== 0 ? ' ' + convert(remainder) : '');
      }
    }
    return '';
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = convert(integerPart) + ' Saudi Riyal' + (integerPart !== 1 ? 's' : '');
  if (decimalPart > 0) {
    result += ' and ' + convert(decimalPart) + ' Halala' + (decimalPart !== 1 ? 's' : '');
  }
  return result + ' Only';
};

interface InvoiceItem {
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  lineTotal: string | number;
  vatAmount: string | number;
  totalAmount: string | number;
}

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerAddress: string;
  customerCity: string;
  customerVat?: string;
  qrCode?: string;
  items: InvoiceItem[];
  subtotal: string | number;
  vatAmount: string | number;
  totalAmount: string | number;
}

interface InvoicePDFProps {
  invoice: InvoiceData;
}

export const InvoicePDF = ({ invoice }: InvoicePDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Company Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</Text>
        <Text style={styles.companyArabic}>شركة صالح عبدالله المالكي للمقاولات العامة</Text>
        <View style={styles.companyInfoRow}>
          <Text><Text style={styles.detailLabel}>VAT:</Text> 312886354600003</Text>
          <Text>    </Text>
          <Text><Text style={styles.detailLabel}>Email:</Text> tawaffallah@gmail.com</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Invoice Title */}
      <View style={styles.invoiceTitle}>
        <Text style={styles.invoiceTitleText}>VAT Invoice</Text>
        <Text style={styles.invoiceTitleArabic}>فاتورة ضريبة القيمة المضافة</Text>
      </View>

      {/* Details Row */}
      <View style={styles.detailsRow}>
        <View style={styles.billToSection}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          <Text style={styles.detailLineArabic}><Text style={styles.detailLabel}>Name:</Text> {invoice.customerName}</Text>
          <Text style={styles.detailLine}><Text style={styles.detailLabel}>Address:</Text> {invoice.customerAddress}</Text>
          <Text style={styles.detailLine}><Text style={styles.detailLabel}>City:</Text> {invoice.customerCity}</Text>
          {invoice.customerVat && (
            <Text style={styles.detailLine}><Text style={styles.detailLabel}>VAT:</Text> {invoice.customerVat}</Text>
          )}
        </View>
        <View style={styles.invoiceInfoSection}>
          <Text style={styles.detailLine}><Text style={styles.detailLabel}>Invoice #:</Text> {invoice.invoiceNumber}</Text>
          <Text style={styles.detailLine}><Text style={styles.detailLabel}>Invoice Date:</Text> {new Date(invoice.issueDate).toLocaleDateString()}</Text>
          <Text style={styles.detailLine}><Text style={styles.detailLabel}>Due Date:</Text> {new Date(invoice.dueDate).toLocaleDateString()}</Text>
          {invoice.qrCode && (
            <Image src={invoice.qrCode} style={styles.qrCode} />
          )}
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <View style={[styles.colNum]}>
            <Text style={styles.tableHeaderCell}>#</Text>
          </View>
          <View style={[styles.colDesc]}>
            <Text style={styles.tableHeaderCell}>Description</Text>
            <Text style={styles.tableHeaderArabic}>الوصف</Text>
          </View>
          <View style={[styles.colQty]}>
            <Text style={styles.tableHeaderCell}>Qty</Text>
            <Text style={styles.tableHeaderArabic}>الكمية</Text>
          </View>
          <View style={[styles.colRate]}>
            <Text style={styles.tableHeaderCell}>Rate</Text>
            <Text style={styles.tableHeaderArabic}>السعر</Text>
          </View>
          <View style={[styles.colAmount]}>
            <Text style={styles.tableHeaderCell}>Taxable Amt</Text>
            <Text style={styles.tableHeaderArabic}>المبلغ الخاضع</Text>
          </View>
          <View style={[styles.colTax]}>
            <Text style={styles.tableHeaderCell}>Tax (SAR)</Text>
            <Text style={styles.tableHeaderArabic}>الضريبة</Text>
          </View>
          <View style={[styles.colTotal]}>
            <Text style={styles.tableHeaderCell}>Net Amount</Text>
            <Text style={styles.tableHeaderArabic}>المبلغ الصافي</Text>
          </View>
        </View>

        {/* Table Body */}
        {invoice.items.map((item, index) => (
          <View key={index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowEven : {}]}>
            <View style={[styles.colNum]}>
              <Text style={[styles.tableCell, styles.tableCellCenter]}>{index + 1}</Text>
            </View>
            <View style={[styles.colDesc]}>
              <Text style={styles.tableCell}>{item.description}</Text>
            </View>
            <View style={[styles.colQty]}>
              <Text style={[styles.tableCell, styles.tableCellCenter]}>{parseFloat(String(item.quantity)).toFixed(2)}</Text>
            </View>
            <View style={[styles.colRate]}>
              <Text style={[styles.tableCell, styles.tableCellRight]}>{parseFloat(String(item.unitPrice)).toFixed(2)}</Text>
            </View>
            <View style={[styles.colAmount]}>
              <Text style={[styles.tableCell, styles.tableCellRight]}>{parseFloat(String(item.lineTotal)).toFixed(2)}</Text>
            </View>
            <View style={[styles.colTax]}>
              <Text style={[styles.tableCell, styles.tableCellRight]}>{parseFloat(String(item.vatAmount)).toFixed(2)}</Text>
            </View>
            <View style={[styles.colTotal]}>
              <Text style={[styles.tableCell, styles.tableCellRight]}>{parseFloat(String(item.totalAmount)).toFixed(2)}</Text>
            </View>
          </View>
        ))}

        {/* Total Row */}
        <View style={styles.totalRow}>
          <View style={[styles.colNum]} />
          <View style={[styles.colDesc]} />
          <View style={[styles.colQty]} />
          <View style={[styles.colRate]}>
            <Text style={[styles.totalCell, styles.tableCellRight]}>Total</Text>
          </View>
          <View style={[styles.colAmount]}>
            <Text style={[styles.totalCell, styles.tableCellRight]}>{parseFloat(String(invoice.subtotal)).toFixed(2)}</Text>
          </View>
          <View style={[styles.colTax]}>
            <Text style={[styles.totalCell, styles.tableCellRight]}>{parseFloat(String(invoice.vatAmount)).toFixed(2)}</Text>
          </View>
          <View style={[styles.colTotal]}>
            <Text style={[styles.totalCell, styles.tableCellRight]}>{parseFloat(String(invoice.totalAmount)).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Net Amount Summary */}
      <View style={styles.summarySection}>
        <View style={styles.netAmount}>
          <Text style={styles.netAmountLabel}>Net Amount:</Text>
          <Text style={styles.netAmountValue}>SAR {parseFloat(String(invoice.totalAmount)).toFixed(2)}</Text>
        </View>
      </View>

      {/* Amount in Words */}
      <View style={styles.amountWords}>
        <Text style={styles.amountWordsText}>
          <Text style={styles.amountWordsLabel}>Amount in Words: </Text>
          {numberToWords(parseFloat(String(invoice.totalAmount)))}
        </Text>
      </View>

      {/* Bank Details */}
      <View style={styles.bankDetails}>
        <Text style={styles.bankDetailsTitle}>Bank Details:</Text>
        <Text style={styles.bankDetailsText}>Account Number: 379000100006865704167</Text>
        <Text style={styles.bankDetailsText}>IBAN Number: SA6600003790001000068657041</Text>
        <Text style={styles.bankDetailsText}>Al rajhi Bank <Text style={styles.bankDetailsArabic}>مصرف الراجحي للاستثمار</Text></Text>
        <Text style={styles.bankDetailsText}>SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</Text>
      </View>
    </Page>
  </Document>
);

export default InvoicePDF;
