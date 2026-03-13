import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Massage Booking
          <span className="text-indigo-600"> Platform</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          All-in-one booking, scheduling, and management platform for massage clinics.
          Manage appointments, staff shifts, inventory, payments, and customers.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div className="mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Online Booking', desc: 'Customers book 24/7 from your branded booking page' },
          { title: 'Shift Management', desc: 'Schedule staff, manage time-off, and track hours' },
          { title: 'Customer CRM', desc: 'Track preferences, medical notes, and visit history' },
          { title: 'Payments', desc: 'Accept online and in-person payments with Stripe' },
          { title: 'Inventory', desc: 'Track supplies, products, and get low-stock alerts' },
          { title: 'Reports', desc: 'Revenue dashboards, staff performance, and analytics' },
        ].map((feature) => (
          <div key={feature.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900">{feature.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
