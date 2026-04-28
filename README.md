# BEOKBG

This project is a modern, modular, and responsive web application for a hardware distributor, inspired by [bg.beok-controls.com](https://bg.beok-controls.com). Built with Next.js, TypeScript, and Tailwind CSS.

## Features
- Clean, modular React components
- Responsive design (mobile-first)
- Tailwind CSS for all styling
- TypeScript everywhere
- Dynamic routes for products and categories
- API routes for orders and pick & pack integration
- PostgreSQL database (Railway)
- Admin panel for product/category/order management
- Automated deployment via GitHub Actions & Railway

## Project Structure
- `/components` – UI components
- `/lib` – Helpers and utilities
- `/app` – Pages and API routes
- `/data/products.json` – Product data (sample)

## Getting Started
1. Clone the repository:
	```
	git clone https://github.com/svetlinivelinov/BEOKBG.git
	cd BEOKBG
	```
2. Install dependencies:
	```
	npm install
	```
3. Set up environment variables in a `.env.local` file:
	```
	DATABASE_URL=your_postgres_url
	PICKPACK_ENDPOINT=your_pickpack_endpoint
	PICKPACK_API_KEY=your_pickpack_api_key
	```
4. Run the development server:
	```
	npm run dev
	```

## Deployment
Deployment is automated via GitHub Actions and Railway. Push to `main` to trigger deployment.

## Contributing
Pull requests are welcome! Please follow the code style and add tests for new features.

## License & Usage
This project is intended for business/commercial use. Ensure you have the legal rights or permission to use all images and content included in the project. Do not use copyrighted materials without proper authorization.