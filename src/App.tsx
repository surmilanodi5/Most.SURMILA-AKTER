
const skills = [
  { name: 'SEO', icon: '🔍', description: 'Search Engine Optimization and website growth.' },
  { name: 'Digital Marketing', icon: '📈', description: 'Digital strategies to grow businesses online.' },
  { name: 'AI Tools', icon: '🤖', description: 'Using AI tools to create smarter workflows.' },
];

const services = [
  { number: '01', title: 'SEO Optimization', description: 'Helping websites improve their search visibility and reach the right audience.' },
  { number: '02', title: 'Digital Marketing', description: 'Creating digital marketing strategies that help brands grow online.' },
  { number: '03', title: 'AI Solutions', description: 'Using modern AI tools to make everyday digital work easier and faster.' },
];

export default function App() {
  return (
    <main className="min-h-screen bg-[#080d1b] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080d1b]/90 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <a href="#home" className="text-2xl font-black tracking-tight">
            Surmila<span className="text-violet-400">.</span>
          </a>
          <div className="flex flex-wrap gap-5 text-sm text-slate-300">
            <a href="#home" className="hover:text-violet-400">Home</a>
            <a href="#about" className="hover:text-violet-400">About</a>
            <a href="#skills" className="hover:text-violet-400">Skills</a>
            <a href="#services" className="hover:text-violet-400">Services</a>
            <a href="#contact" className="hover:text-violet-400">Contact</a>
          </div>
        </nav>
      </header>

      <section id="home" className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2 md:py-36">
        <div>
          <p className="mb-5 font-semibold tracking-[0.25em] text-violet-400">HELLO, WELCOME TO MY PORTFOLIO</p>
          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            Hi, I'm <span className="text-violet-400">Surmila Akter</span>
          </h1>
          <h2 className="mt-5 text-2xl font-semibold text-slate-200">
            Digital Marketer & AI Specialist
          </h2>
          <p className="mt-6 max-w-lg leading-8 text-slate-400">
            I help businesses grow online through SEO, digital marketing and
            smart AI tools. I love learning new technologies and creating
            meaningful digital solutions.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a href="#contact" className="rounded-full bg-violet-600 px-7 py-3 font-bold transition hover:bg-violet-500">
              Contact Me →
            </a>
            <a href="#about" className="rounded-full border border-white/20 px-7 py-3 font-bold transition hover:border-violet-400">
              About Me
            </a>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex h-72 w-72 items-center justify-center rounded-full border border-violet-400/40 bg-gradient-to-br from-violet-600/30 to-cyan-400/10 shadow-2xl shadow-violet-900/40 md:h-96 md:w-96">
            <div className="text-center">
              <div className="text-8xl">👩‍💻</div>
              <p className="mt-5 text-xl font-bold">Surmila Akter</p>
              <p className="mt-1 text-sm text-violet-300">Digital Creator</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-y border-white/10 bg-white/[0.03] px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-semibold tracking-widest text-violet-400">GET TO KNOW ME</p>
          <h2 className="mt-4 text-4xl font-black">About Me</h2>
          <p className="mt-8 text-lg leading-9 text-slate-300">
            Hello! I'm Surmila Akter, a passionate Digital Marketer and AI
            Specialist. I have 6 months of experience in SEO and Digital
            Marketing. I enjoy exploring AI tools, learning new skills and
            helping businesses build a stronger online presence.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#111a2e] p-7">
              <p className="text-4xl font-black text-violet-400">06+</p>
              <p className="mt-2 text-slate-300">Months of Experience</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111a2e] p-7">
              <p className="text-4xl font-black text-violet-400">03</p>
              <p className="mt-2 text-slate-300">Core Skill Areas</p>
            </div>
          </div>
        </div>
      </section>

      <section id="skills" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="font-semibold tracking-widest text-violet-400">WHAT I KNOW</p>
          <h2 className="mt-4 text-4xl font-black">My Skills</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {skills.map((skill) => (
            <div key={skill.name} className="rounded-2xl border border-white/10 bg-[#111a2e] p-8 transition hover:-translate-y-2 hover:border-violet-400/60">
              <div className="text-4xl">{skill.icon}</div>
              <h3 className="mt-5 text-xl font-bold">{skill.name}</h3>
              <p className="mt-3 leading-7 text-slate-400">{skill.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="border-y border-white/10 bg-white/[0.03] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="font-semibold tracking-widest text-violet-400">HOW I CAN HELP</p>
            <h2 className="mt-4 text-4xl font-black">What I Do</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <div key={service.number} className="rounded-2xl border border-white/10 bg-[#111a2e] p-8">
                <p className="text-3xl font-black text-violet-400">{service.number}</p>
                <h3 className="mt-6 text-xl font-bold">{service.title}</h3>
                <p className="mt-4 leading-7 text-slate-400">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="font-semibold tracking-widest text-violet-400">LET'S CONNECT</p>
        <h2 className="mt-4 text-4xl font-black">Have a Project in Mind?</h2>
        <p className="mx-auto mt-5 max-w-xl leading-8 text-slate-400">
          I'd love to hear about your ideas and discuss how we can work together.
          Feel free to send me an email.
        </p>
        <a href="mailto:surmilanodi5@gmail.com" className="mt-9 inline-block rounded-full bg-violet-600 px-8 py-4 font-bold transition hover:bg-violet-500">
          ✉ surmilanodi5@gmail.com
        </a>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Surmila Akter. All rights reserved.
      </footer>
    </main>
  );
}

