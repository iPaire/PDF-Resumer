export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 text-black">
      <h1 className="text-3xl font-bold mb-4">Politica de cookie-uri</h1>
      <p className="mb-4">
        Această aplicație folosește cookie-uri pentru a asigura o experiență optimă de utilizare.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>Folosim cookie-uri pentru autentificare, preferințe de limbă și analiză a traficului.</li>
        <li>Cookie-urile nu conțin informații personale identificabile.</li>
        <li>Puteți alege să dezactivați cookie-urile din setările browserului, însă unele funcționalități pot fi afectate.</li>
        <li>Prin continuarea utilizării platformei, sunteți de acord cu politica noastră de cookie-uri.</li>
      </ul>
    </div>
  );
}
