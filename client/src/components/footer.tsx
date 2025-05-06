import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-neutral-darker text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center">
              <div className="bg-white/10 p-2 rounded-full">
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 64 64" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  <path d="M32 8C25.5 8 20 13.5 20 20C20 26.5 25.5 32 32 32C38.5 32 44 26.5 44 20C44 13.5 38.5 8 32 8ZM32 28C27.6 28 24 24.4 24 20C24 15.6 27.6 12 32 12C36.4 12 40 15.6 40 20C40 24.4 36.4 28 32 28Z" fill="currentColor"/>
                  <path d="M54 36H10C7.8 36 6 37.8 6 40V52C6 54.2 7.8 56 10 56H54C56.2 56 58 54.2 58 52V40C58 37.8 56.2 36 54 36ZM54 52H10V40H54V52Z" fill="currentColor"/>
                  <path d="M28 44H32V48H28V44Z" fill="currentColor"/>
                  <path d="M36 44H52V48H36V44Z" fill="currentColor"/>
                  <path d="M28 44H32V48H28V44Z" fill="currentColor"/>
                  <path d="M12 44H24V48H12V44Z" fill="currentColor"/>
                  <path d="M28 44H32V48H28V44Z" fill="currentColor"/>
                </svg>
              </div>
              <span className="ml-2 text-xl font-bold">Drama Llama</span>
            </div>
            <p className="mt-2 text-sm text-neutral-medium">© 2025 Drama Llama AI Ltd</p>
            <p className="text-sm text-neutral-medium">Company registration pending – England & Wales</p>
            <p className="mt-2 font-medium text-accent">"They gaslight. We spotlight."</p>
          </div>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8">
            <div>
              <h4 className="font-semibold mb-3">Features</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#chatAnalysis" className="hover:text-primary transition">Chat Analysis</a></li>
                <li><a href="#messageAnalysis" className="hover:text-primary transition">Message Analysis</a></li>
                <li><a href="#ventMode" className="hover:text-primary transition">Vent Mode</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Plans</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#pricing" className="hover:text-primary transition">Free</a></li>
                <li><a href="#pricing" className="hover:text-primary transition">Personal</a></li>
                <li><a href="#pricing" className="hover:text-primary transition">Pro</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-primary transition">About Us</Link></li>
                <li><Link href="/" className="hover:text-primary transition">Privacy Policy</Link></li>
                <li><Link href="/" className="hover:text-primary transition">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
