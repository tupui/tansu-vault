import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Shield, TrendingUp, Leaf, Users, Zap, Globe } from 'lucide-react';
import heroImage from '@/assets/stellar-vault-hero.jpg';
import { motion } from 'framer-motion';
const Index = () => {
  const features = [{
    icon: TrendingUp,
    title: 'Yield Generation',
    description: 'Earn competitive yields on your project treasury while maintaining full liquidity',
    gradient: 'bg-gradient-vault'
  }, {
    icon: Shield,
    title: 'Secure & Transparent',
    description: 'Built on Stellar blockchain with audited smart contracts and full on-chain transparency',
    gradient: 'bg-gradient-stellar'
  }, {
    icon: Leaf,
    title: 'Carbon Neutral',
    description: 'Automatic carbon offset for all vault operations through StellarCarbon integration',
    gradient: 'bg-gradient-carbon'
  }, {
    icon: Users,
    title: 'DAO Integration',
    description: 'Seamlessly integrate with your existing Tansu DAO governance structure',
    gradient: 'bg-gradient-surface'
  }];
  const stats = [{
    value: '—',
    label: 'Total Value Locked'
  }, {
    value: '—',
    label: 'Active Projects'
  }, {
    value: '—',
    label: 'Average APY'
  }, {
    value: '—',
    label: 'Carbon Offset'
  }];
  return <Layout>
      <Navigation />
      
      <div className="pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="container mx-auto px-6 py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.6
            }} className="space-y-8">
                <div className="space-y-4">
                  <Badge className="bg-gradient-stellar text-primary-foreground border-0">
                    <Zap className="mr-1 h-3 w-3" />
                    Powered by DeFindex & Stellar
                  </Badge>
                  
                  <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                    <span className="bg-gradient-stellar bg-clip-text text-transparent">
                      Stellar Vault
                    </span>
                    <br />
                    for Tansu Projects
                  </h1>
                  
                  <p className="text-xl text-muted-foreground max-w-lg">
                    Transform idle project treasuries into yield-generating assets. 
                    Connect your Tansu project to our institutional-grade DeFi vault 
                    and start earning sustainable returns today.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-gradient-stellar text-primary-foreground border-0 glow-stellar hover:shadow-stellar transition-all duration-300" onClick={() => window.location.href = '/dashboard'}>
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
                  {stats.map((stat, index) => <motion.div key={index} initial={{
                  opacity: 0,
                  y: 20
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  duration: 0.6,
                  delay: 0.2 + index * 0.1
                }} className="text-center">
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </motion.div>)}
                </div>
              </motion.div>

              <motion.div initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              duration: 0.8,
              delay: 0.2
            }} className="relative">
                <div className="aspect-video rounded-2xl overflow-hidden shadow-stellar border border-border/20">
                  <img src={heroImage} alt="Stellar Vault - DeFi for Project Treasuries" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-2xl" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }} viewport={{
            once: true
          }} className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Why Choose Tansu Vault?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Built specifically for open-source projects, our vault combines the best of 
                DeFi yields with environmental responsibility and DAO governance.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => <motion.div key={index} initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.6,
              delay: index * 0.1
            }} viewport={{
              once: true
            }}>
                  <Card className="glass border-border/50 hover:shadow-elevation transition-all duration-300 h-full">
                    <CardHeader>
                      <div className={`p-3 rounded-xl ${feature.gradient} w-fit`}>
                        <feature.icon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>)}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }} viewport={{
            once: true
          }}>
              <Card className="glass border-border/50 shadow-stellar">
                <CardContent className="p-12 text-center">
                  <h3 className="text-3xl font-bold mb-4">
                    Ready to optimize your project treasury?
                  </h3>
                  <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                    Join the growing ecosystem of Tansu projects earning sustainable yields 
                    while contributing to carbon neutrality.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button size="lg" className="bg-gradient-stellar text-primary-foreground border-0 glow-stellar hover:shadow-stellar transition-all duration-300">
                      Connect Wallet & Start
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button size="lg" variant="outline" className="border-border hover:bg-surface-elevated">
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>;
};
export default Index;