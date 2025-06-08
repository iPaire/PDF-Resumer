export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 text-black">
      <h1 className="text-3xl font-bold mb-4">Termeni și condiții</h1>
      <p className="mb-4">
        Prin utilizarea serviciilor oferite de SmartPDF Notes, sunteți de acord cu următorii termeni și condiții. Vă rugăm să citiți cu atenție.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>Utilizatorii sunt responsabili de conținutul fișierelor PDF încărcate.</li>
        <li>Nu este permisă utilizarea platformei pentru materiale ilegale sau ofensatoare.</li>
        <li>Serviciile gratuite sunt limitate în funcție de planul selectat și pot fi modificate în timp.</li>
        <li>SmartPDF Notes nu garantează acuratețea absolută a rezultatelor generate de AI.</li>
        <li>Ne rezervăm dreptul de a modifica acești termeni oricând, fără notificare prealabilă.</li>
      </ul>
    </div>
  );
}
