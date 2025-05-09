import { Link } from "wouter";
import llamaImage from "@assets/FB Profile Pic.png";

export default function Footer() {
  return (
    <footer className="bg-primary text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center">
              <img 
                src={llamaImage} 
                alt="Drama Llama" 
                className="w-12 h-12 rounded-full object-cover border-2 border-white" 
              />
              <span className="ml-3 text-xl font-bold">Drama Llama</span>
            </div>
            <p className="mt-2 text-sm text-white/80">© 2025 Drama Llama AI Ltd</p>
            <p className="text-sm text-white/80">Company number: 16428423 – England & Wales</p>
            <p className="mt-2 font-medium text-secondary">"They gaslight. We spotlight."</p>
          </div>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8">
            <div>
              <h4 className="font-semibold mb-3 text-white">Features</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#chatAnalysis" className="text-white/80 hover:text-secondary transition">Chat Analysis</a></li>
                <li><a href="#messageAnalysis" className="text-white/80 hover:text-secondary transition">Message Analysis</a></li>
                <li><a href="#ventMode" className="text-white/80 hover:text-secondary transition">Vent Mode</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-white">Plans</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#pricing" className="text-white/80 hover:text-secondary transition">Free</a></li>
                <li><a href="#pricing" className="text-white/80 hover:text-secondary transition">Personal</a></li>
                <li><a href="#pricing" className="text-white/80 hover:text-secondary transition">Pro</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="text-white/80 hover:text-secondary transition">About Us</Link></li>
                <li><Link href="/privacy-policy" className="text-white/80 hover:text-secondary transition">Privacy Policy</Link></li>
                <li><Link href="/" className="text-white/80 hover:text-secondary transition">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
